/**
 * NILAA FOODS & SPICES — SMART EXCEL RECONCILIATION ENGINE
 * Scoped two-way comparison between Excel workbooks and Supabase production logs.
 * Preserves historical UUIDs while guaranteeing robust reordering, duplicate-sheet detection,
 * and persistent discrepancy tracking.
 */

/**
 * Computes SHA-256 checksum of an Excel file or buffer
 * Uses Web Crypto API (supported natively in modern browsers and Node 18+)
 */
export const computeFileSha256 = async (fileOrBuffer) => {
    try {
        const cryptoObj = typeof window !== 'undefined' ? (window.crypto || window.msCrypto) : globalThis.crypto;
        if (cryptoObj && cryptoObj.subtle) {
            let arrayBuffer;
            if (fileOrBuffer instanceof ArrayBuffer) {
                arrayBuffer = fileOrBuffer;
            } else if (fileOrBuffer && typeof fileOrBuffer.arrayBuffer === 'function') {
                arrayBuffer = await fileOrBuffer.arrayBuffer();
            } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileOrBuffer)) {
                arrayBuffer = fileOrBuffer.buffer.slice(fileOrBuffer.byteOffset, fileOrBuffer.byteOffset + fileOrBuffer.byteLength);
            } else {
                arrayBuffer = new TextEncoder().encode(String(fileOrBuffer)).buffer;
            }

            const hashBuffer = await cryptoObj.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
        return null;
    } catch (err) {
        console.error("Failed to compute SHA-256 hash:", err);
        return null;
    }
};

/**
 * Detects duplicate or backup worksheet names in a workbook
 * e.g. 'June 2025111' alongside 'June 2025 ', or 'July 2025 (2)' alongside 'July 2025'
 */
export const detectDuplicateWorksheets = (sheetNames = []) => {
    const validSheets = [];
    const duplicateSheets = [];
    const warnings = [];

    const normalizeName = (name) => {
        const clean = name.trim().toLowerCase();
        // Match 3-letter month followed optionally by characters, spaces, and 4-digit year (e.g. "June 2025111" or "July 2025 (2)")
        const match = clean.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(20\d\d)/i);
        if (match) {
            return `${match[1].toLowerCase().slice(0, 3)} ${match[2]}`;
        }
        return clean.replace(/\s+/g, ' ').replace(/[\(\)\[\]]/g, '').replace(/\d+$/, '').trim();
    };

    const seenNormalized = new Map();

    sheetNames.forEach(name => {
        const norm = normalizeName(name);
        if (seenNormalized.has(norm)) {
            const primaryName = seenNormalized.get(norm);
            duplicateSheets.push({ duplicate: name, primary: primaryName });
            warnings.push(`Worksheet "${name}" appears to be a duplicate or backup clone of "${primaryName}". Skipping to prevent duplicate records.`);
        } else {
            seenNormalized.set(norm, name);
            validSheets.push(name);
        }
    });

    return { validSheets, duplicateSheets, warnings };
};

/**
 * Deterministic UUID generator preserving existing legacy production UUID algorithm
 */
export const generateLegacyUUID = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    const base = Math.abs(hash).toString(16).padEnd(32, '0');
    return `${base.slice(0, 8)}-${base.slice(8, 12)}-4${base.slice(12, 15)}-a${base.slice(15, 18)}-${base.slice(18, 30)}`;
};

/**
 * Generates a durable logical identity key independent of mutable quantities or shifted row indices
 */
export const generateLogicalKey = (type, date, material, occurrenceIndex = 0) => {
    const cleanType = String(type || '').toLowerCase().trim();
    const cleanDate = String(date || '').trim();
    const cleanMat = String(material || '').toUpperCase().trim();
    return `${cleanType}:${cleanDate}:${cleanMat}:${occurrenceIndex}`;
};

/**
 * Normalizes reporting period from date or sheet name (returns YYYY-MM-01)
 */
export const normalizeReportingPeriod = (dateOrSheetName) => {
    if (!dateOrSheetName) return null;
    const str = String(dateOrSheetName).trim();

    // Check if YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-01`;
    }

    // Check if Month Year e.g. "Sep 2026" or "September 2026"
    const monthMap = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const parts = str.split(/[\s_-]+/);
    let m = null, y = null;
    parts.forEach(p => {
        const pLower = p.toLowerCase();
        if (monthMap[pLower.slice(0, 3)]) m = monthMap[pLower.slice(0, 3)];
        if (/^\d{4}$/.test(p)) y = p;
    });

    if (m && y) return `${y}-${m}-01`;
    return null;
};

/**
 * Core Scoped Two-Way Reconciliation Classifier
 * Categorizes records into: new, modified, unchanged, missing, conflict, invalid.
 */
export const classifyReconciliationRecords = ({
    inboundRows = [],
    existingDbRows = [],
    worksheetScope = '',
    reportingPeriod = '',
    isAuthoritativeSnapshot = true,
    cutoverDate = null
}) => {
    const results = {
        newRecords: [],
        modifiedRecords: [],
        unchangedRecords: [],
        missingRecords: [],
        conflictRecords: [],
        invalidRecords: [],
        legacyProtectedRows: [],
        isHistoricalPeriod: false,
        cutoverMessage: null,
        stockImpact: {
            stockInDelta: 0,
            usageDelta: 0,
            productionDelta: 0,
            materialDeltas: {}
        },
        counts: {
            totalInbound: inboundRows.length,
            newCount: 0,
            modifiedCount: 0,
            unchangedCount: 0,
            missingCount: 0,
            conflictCount: 0,
            invalidCount: 0,
            legacyProtectedCount: 0
        }
    };

    // Task 4: Historical Period Check
    const normalizedPeriod = reportingPeriod ? normalizeReportingPeriod(reportingPeriod) : null;
    if (cutoverDate && normalizedPeriod && normalizedPeriod < cutoverDate) {
        results.isHistoricalPeriod = true;
        results.cutoverMessage = `Reporting period ${reportingPeriod} is prior to reconciliation cutover date (${cutoverDate}). Historical records are protected and immutable.`;
        results.legacyProtectedRows = [...inboundRows];
        results.counts.legacyProtectedCount = inboundRows.length;
        return results;
    }

    // Task 5: Mixed Workbook Handling - Separate Legacy Rows Prior to Cutover
    let activeInboundRows = inboundRows;
    if (cutoverDate) {
        const futureRows = [];
        const legacyRows = [];
        inboundRows.forEach(row => {
            if (row.date && row.date < cutoverDate) {
                legacyRows.push(row);
            } else {
                futureRows.push(row);
            }
        });
        results.legacyProtectedRows = legacyRows;
        results.counts.legacyProtectedCount = legacyRows.length;
        activeInboundRows = futureRows;
    }

    // 1. Separate Invalids First
    const validInbound = [];
    activeInboundRows.forEach((row, idx) => {
        const errors = [];
        if (!row.date) errors.push("Missing date");
        if (!row.material) errors.push("Missing material name");
        if (row.weight === undefined || row.weight === null || isNaN(row.weight) || Number(row.weight) <= 0) {
            errors.push(`Invalid weight: ${row.weight}`);
        }

        if (errors.length > 0) {
            results.invalidRecords.push({ ...row, rowIndex: idx + 1, errors });
        } else {
            validInbound.push(row);
        }
    });
    results.counts.invalidCount = results.invalidRecords.length;

    // 2. Index DB Rows by ID and by Scoped Logical Signature
    // CRITICAL STAGE 3I RULE: Only future reconciliation-managed records participate in reconciliation.
    // When cutoverDate is active, only records with is_reconciliation_managed === true participate.
    // All historical legacy records are protected, excluded from comparison, never modified, and never flagged as missing.
    const isManaged = (r) => cutoverDate ? (r.is_reconciliation_managed === true) : (r.is_reconciliation_managed !== false);
    const matchesWorksheet = (r, ws) => {
        if (!ws) return true;
        const cleanWs = ws.trim();
        if (r.source_lineage && r.source_lineage.includes(`::${cleanWs}`)) return true;
        if (r.remarks && r.remarks.includes(`Sheet: ${cleanWs}`)) return true;
        if (!r.source_lineage && !r.remarks) return true;
        return false;
    };
    const activeDbRows = existingDbRows.filter(r => isManaged(r) && matchesWorksheet(r, worksheetScope) && r.status !== 'approved_deleted' && r.is_deleted !== true);
    const softDeletedDbRows = existingDbRows.filter(r => isManaged(r) && matchesWorksheet(r, worksheetScope) && (r.status === 'approved_deleted' || r.is_deleted === true));
    const legacyDbRows = existingDbRows.filter(r => !isManaged(r));
    
    const dbById = new Map();
    const dbBySignature = new Map(); // signature -> Array of DB rows

    activeDbRows.forEach(dbRow => {
        dbById.set(dbRow.id, dbRow);
        const sig = `${dbRow.type}:${dbRow.date}:${String(dbRow.material).toUpperCase().trim()}`;
        if (!dbBySignature.has(sig)) {
            dbBySignature.set(sig, []);
        }
        dbBySignature.get(sig).push({ ...dbRow, matched: false });
    });

    // Track matched DB record IDs to detect missing rows
    const matchedDbIds = new Set();

    // 3. Match Inbound Rows against DB Rows
    // Group inbound rows by signature
    const inboundBySignature = new Map();
    validInbound.forEach(row => {
        const sig = `${row.type}:${row.date}:${String(row.material).toUpperCase().trim()}`;
        if (!inboundBySignature.has(sig)) {
            inboundBySignature.set(sig, []);
        }
        inboundBySignature.get(sig).push({ ...row, matched: false });
    });

    inboundBySignature.forEach((inboundGroup, sig) => {
        const dbGroup = dbBySignature.get(sig) || [];

        // PASS 1: Exact ID matching
        inboundGroup.forEach(inboundRow => {
            if (inboundRow.id && dbById.has(inboundRow.id) && !matchedDbIds.has(inboundRow.id)) {
                const targetDb = dbGroup.find(c => c.id === inboundRow.id && !c.matched);
                if (targetDb) {
                    targetDb.matched = true;
                    inboundRow.matched = true;
                    inboundRow.targetDbId = targetDb.id;
                    matchedDbIds.add(targetDb.id);
                    recordMatch(inboundRow, targetDb);
                }
            }
        });

        // PASS 2: Exact Weight AND Remarks matching with Group-Level Ambiguity Protection
        // Group remaining unmatched by exact weight and normalized remarks
        const getBatchKey = (row) => `${Number(row.weight).toFixed(4)}::${(row.remarks || '').trim()}`;
        
        const inboundBatchMap = new Map();
        inboundGroup.filter(r => !r.matched).forEach(r => {
            const key = getBatchKey(r);
            if (!inboundBatchMap.has(key)) inboundBatchMap.set(key, []);
            inboundBatchMap.get(key).push(r);
        });

        const dbBatchMap = new Map();
        dbGroup.filter(c => !c.matched).forEach(c => {
            const key = getBatchKey(c);
            if (!dbBatchMap.has(key)) dbBatchMap.set(key, []);
            dbBatchMap.get(key).push(c);
        });

        inboundBatchMap.forEach((subInbound, key) => {
            const subDb = dbBatchMap.get(key) || [];
            const M = subInbound.length;
            const N = subDb.length;

            if (M === N && N > 0) {
                // Perfect 1-to-1 match of all identical batches
                for (let i = 0; i < N; i++) {
                    const inRow = subInbound[i];
                    const dbRow = subDb[i];
                    dbRow.matched = true;
                    inRow.matched = true;
                    inRow.targetDbId = dbRow.id;
                    matchedDbIds.add(dbRow.id);
                    recordMatch(inRow, dbRow);
                }
            } else if (M < N && N > 0) {
                // One or more indistinguishable batches disappeared from Excel!
                // Pair M batches for quantity tracking
                for (let i = 0; i < M; i++) {
                    const inRow = subInbound[i];
                    const dbRow = subDb[i];
                    dbRow.matched = true;
                    inRow.matched = true;
                    inRow.targetDbId = dbRow.id;
                    matchedDbIds.add(dbRow.id);
                    recordMatch(inRow, dbRow);
                }

                // Remaining K = N - M batches are MISSING, but cannot be identified by single UUID
                const K = N - M;
                const remainingUnmatchedDb = subDb.slice(M);
                remainingUnmatchedDb.forEach(d => {
                    d.matched = true;
                    matchedDbIds.add(d.id);
                });

                if (isAuthoritativeSnapshot) {
                    const sample = subDb[0];
                    results.missingRecords.push({
                        isAmbiguous: true,
                        requiresAdminSelection: true,
                        groupKey: sig,
                        date: sample.date,
                        type: sample.type,
                        material: sample.material,
                        weight: Number(sample.weight),
                        remarks: sample.remarks || '',
                        missingCount: K,
                        missingWeight: K * Number(sample.weight),
                        candidateRecordIds: subDb.map(d => d.id),
                        candidateDbRows: subDb.map(d => ({ id: d.id, weight: d.weight, remarks: d.remarks, created_at: d.created_at })),
                        reason: `Group-Level Ambiguity: ${K} of ${N} identical ${sample.material} batches (${sample.weight} kg) missing from authoritative Excel. Administrator selection required to confirm which specific batch was deleted.`
                    });
                    trackMaterialImpact(results.stockImpact, sample.type, sample.material, -K * Number(sample.weight));
                    // Alert via conflict count that manual resolution is required
                    results.counts.conflictCount += 1;
                }
            } else if (M > N && N > 0) {
                // More batches in Excel than in DB: match N as unchanged, remaining M - N will be classified NEW in Pass 5
                for (let i = 0; i < N; i++) {
                    const inRow = subInbound[i];
                    const dbRow = subDb[i];
                    dbRow.matched = true;
                    inRow.matched = true;
                    inRow.targetDbId = dbRow.id;
                    matchedDbIds.add(dbRow.id);
                    recordMatch(inRow, dbRow);
                }
            }
        });

        // PASS 3: Exact Weight matching (remarks differ or empty)
        inboundGroup.filter(r => !r.matched).forEach(inboundRow => {
            const weightCandidates = dbGroup.filter(c => 
                !c.matched && 
                Math.abs(Number(c.weight) - Number(inboundRow.weight)) < 0.0001
            );
            // If exactly one DB candidate has this weight, pair unambiguously
            if (weightCandidates.length === 1) {
                const candidate = weightCandidates[0];
                candidate.matched = true;
                inboundRow.matched = true;
                inboundRow.targetDbId = candidate.id;
                matchedDbIds.add(candidate.id);
                recordMatch(inboundRow, candidate);
            }
        });

        // PASS 4: Disambiguated Modifications & Conflict Detection
        const remainingInbound = inboundGroup.filter(r => !r.matched);
        const remainingDb = dbGroup.filter(c => !c.matched);

        if (remainingInbound.length === 1 && remainingDb.length === 1) {
            // Unambiguous 1-to-1 modification
            const inRow = remainingInbound[0];
            const dbRow = remainingDb[0];
            dbRow.matched = true;
            inRow.matched = true;
            inRow.targetDbId = dbRow.id;
            matchedDbIds.add(dbRow.id);
            recordMatch(inRow, dbRow);
        } else if (remainingInbound.length > 0 && remainingDb.length > 0) {
            // Ambiguity: Multiple unmatched DB candidates or multiple inbound candidates
            // Cannot reliably determine which batch was modified vs deleted vs inserted
            remainingInbound.forEach(inRow => {
                inRow.matched = true; // Handled as conflict
                results.conflictRecords.push({
                    inbound: inRow,
                    candidateDbRows: remainingDb.map(d => ({ id: d.id, weight: d.weight, remarks: d.remarks })),
                    reason: `Ambiguous identity: multiple potential candidate records (${remainingDb.length} in DB) for ${sig}. Manual review required.`
                });
            });
            // Mark remaining DB rows as matched so they are not also falsely flagged as simple missing records
            remainingDb.forEach(d => {
                d.matched = true;
                matchedDbIds.add(d.id);
            });
        }

        // PASS 5: Remaining Inbound Rows are NEW Records or Separate Soft-Deleted Restorations
        inboundGroup.filter(r => !r.matched).forEach((inboundRow, idx) => {
            // Task 2 (Stage 3I.3): Evidence-Based Legacy Collision Assessment
            const collidingLegacy = legacyDbRows.filter(l =>
                l.type === inboundRow.type &&
                l.date === inboundRow.date &&
                String(l.material).toUpperCase().trim() === String(inboundRow.material).toUpperCase().trim()
            );

            if (collidingLegacy.length > 0) {
                // Check if any legacy record matches exact weight
                const exactMatch = collidingLegacy.find(l => 
                    Math.abs(Number(l.weight) - Number(inboundRow.weight)) < 0.0001
                );

                if (exactMatch) {
                    // 1. Confirmed Duplicate: exact match on date, type, material, weight
                    results.conflictRecords.push({
                        type: 'confirmed_legacy_duplicate',
                        inbound: inboundRow,
                        candidateDbRows: [exactMatch],
                        reason: `Confirmed duplicate: matches existing historical record on date, type, material, and weight. Duplicate insertion prevented.`
                    });
                    return; // Block duplicate insertion
                }

                // Check for distinct batch/shift evidence
                const remarks = String(inboundRow.remarks || '');
                const isDistinctBatch = /(shift\s*[b-z]|batch\s*[2-9]|run\s*[2-9]|evening|night|second)/i.test(remarks) || 
                                       Boolean(inboundRow.batch_number);

                if (isDistinctBatch) {
                    // 2. Legitimate Additional Batch: distinct evidence of separate production run
                    // Allow insertion as new managed batch (proceeds below)
                } else {
                    // 3. Ambiguous Identity: quantity differs without distinct batch provenance
                    results.conflictRecords.push({
                        type: 'legacy_ambiguity_conflict',
                        inbound: inboundRow,
                        candidateDbRows: collidingLegacy.map(d => ({ id: d.id, weight: d.weight, remarks: d.remarks })),
                        reason: `Ambiguous identity: quantity differs from existing historical record (${collidingLegacy.length} found) but distinct batch provenance is not established. Administrator review required.`
                    });
                    return; // Fail safely without altering historical records
                }
            }

            // Task 3: Search approved-deleted records separately
            const deletedMatches = softDeletedDbRows.filter(d => 
                d.type === inboundRow.type && 
                d.date === inboundRow.date && 
                String(d.material).toUpperCase().trim() === String(inboundRow.material).toUpperCase().trim() &&
                Math.abs(Number(d.weight) - Number(inboundRow.weight)) < 0.0001
            );

            const logicalKey = generateLogicalKey(inboundRow.type, inboundRow.date, inboundRow.material, idx);
            inboundRow.logical_key = logicalKey;

            if (deletedMatches.length === 1) {
                // Unambiguous restoration: exactly one soft-deleted record matches
                inboundRow.isRestoration = true;
                inboundRow.targetDbId = deletedMatches[0].id;
                results.newRecords.push(inboundRow);
                trackMaterialImpact(results.stockImpact, inboundRow.type, inboundRow.material, Number(inboundRow.weight));
            } else if (deletedMatches.length > 1) {
                // Ambiguous restoration: multiple soft-deleted records match!
                // Treat as conflict requiring administrator review
                results.conflictRecords.push({
                    inbound: inboundRow,
                    candidateDbRows: deletedMatches.map(d => ({ id: d.id, weight: d.weight, remarks: d.remarks })),
                    reason: `Ambiguous restoration: multiple (${deletedMatches.length}) soft-deleted records match inbound row. Administrator review required.`
                });
            } else {
                results.newRecords.push(inboundRow);
                trackMaterialImpact(results.stockImpact, inboundRow.type, inboundRow.material, Number(inboundRow.weight));
            }
        });
    });

    function recordMatch(inboundRow, matchedDbRow) {
        // Aligned with server RPC reconcile_production_batch:
        // Record is classified as modified if business fields (weight, date, material) differ.
        const isWeightDiff = Math.abs(Number(matchedDbRow.weight) - Number(inboundRow.weight)) >= 0.0001;
        const isDateDiff = inboundRow.date && matchedDbRow.date !== inboundRow.date;
        const isMaterialDiff = inboundRow.material && String(matchedDbRow.material).toUpperCase().trim() !== String(inboundRow.material).toUpperCase().trim();
        const isBusinessDiff = isWeightDiff || isDateDiff || isMaterialDiff;

        if (isBusinessDiff) {
            results.modifiedRecords.push({
                id: matchedDbRow.id,
                inbound: inboundRow,
                db: matchedDbRow,
                diff: {
                    weightBefore: Number(matchedDbRow.weight),
                    weightAfter: Number(inboundRow.weight),
                    delta: Number(inboundRow.weight) - Number(matchedDbRow.weight),
                    remarksBefore: matchedDbRow.remarks || '',
                    remarksAfter: inboundRow.remarks || ''
                }
            });

            // Track stock delta
            const delta = Number(inboundRow.weight) - Number(matchedDbRow.weight);
            trackMaterialImpact(results.stockImpact, inboundRow.type, inboundRow.material, delta);
        } else {
            results.unchangedRecords.push({
                id: matchedDbRow.id,
                row: inboundRow
            });
        }
    }

    // 4. Detect MISSING Records (Present in DB within scope, but absent from file)
    if (isAuthoritativeSnapshot) {
        activeDbRows.forEach(dbRow => {
            if (!matchedDbIds.has(dbRow.id)) {
                results.missingRecords.push(dbRow);
                // Missing record impact (if deleted, subtracts from stock)
                trackMaterialImpact(results.stockImpact, dbRow.type, dbRow.material, -Number(dbRow.weight));
            }
        });
    }

    // 5. Update Summary Counts
    results.counts.newCount = results.newRecords.length;
    results.counts.modifiedCount = results.modifiedRecords.length;
    results.counts.unchangedCount = results.unchangedRecords.length;
    results.counts.missingCount = results.missingRecords.length;
    results.counts.conflictCount = results.conflictRecords.length;

    return results;
};

const trackMaterialImpact = (stockImpact, type, material, delta) => {
    const matKey = String(material || '').toUpperCase().trim();
    if (!stockImpact.materialDeltas[matKey]) {
        stockImpact.materialDeltas[matKey] = 0;
    }
    stockImpact.materialDeltas[matKey] += delta;

    if (type === 'stock_in') stockImpact.stockInDelta += delta;
    else if (type === 'usage') stockImpact.usageDelta += delta;
    else if (type === 'production') stockImpact.productionDelta += delta;
};
