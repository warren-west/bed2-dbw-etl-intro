// a Set is a special type of Array
// It only stores unique values

let numbersWithDuplicates = [ 11, 15, 11, 12, 8, 17, 9, 8 ]
let namesWithDuplicates = [ 'Warren', 'Filmon', 'Warren', 'Pal', 'Filmon', 'Warren', 'Pal' ]

let uniqueNumbers = new Set(numbersWithDuplicates)
let uniqueNames = new Set(namesWithDuplicates)

for (let n of uniqueNames) {
    console.log(n)
}

if (numbersWithDuplicates.length !== uniqueNumbers.size) {
    const numberOfDuplicates = numbersWithDuplicates.length - uniqueNumbers.size
    console.log(`There are ${numberOfDuplicates} duplicated numbers!`)
}
if (namesWithDuplicates.length !== uniqueNames.size) {
    const numberOfDuplicates = namesWithDuplicates.length - uniqueNames.size
    console.log(`There are ${numberOfDuplicates} duplicated names!`)
}

const emptySet = new Set([])
console.log(emptySet)