const shifts = Array(3).fill({ in: '', out: '' });
console.log("Initial:", JSON.stringify(shifts));

shifts[0].in = "09:00";
console.log("After Modifying Index 0:", JSON.stringify(shifts));

console.log("Are they same object?", shifts[0] === shifts[1]);
