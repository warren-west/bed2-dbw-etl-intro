// The JavaScript .map() function
// is a helper method on the Array.Prototype
// Used to transform every element in a collection
// You can define some logic that's applied to every element

function processAllNumbers() {
    const numbers = [ 12, 16, 3, 8, 22 ]

    return numbers.map((element) => {
        return addTwoToNumber(doubleNumber(element))
    })
}

function doubleNumber(n) {
    return n * 2
}

function addTwoToNumber(n) {
    return n + 2
}

console.log(processAllNumbers())



function processStrings() {
    const names = [ "Trym", "Adrian", "Warren", "Pål" ]

    return names.map(n => {
        let changedName = makeNameLowercase(n)
        changedName = trimWhiteSpaceOffName(n)

        // for each name, split it into an array of characters,
        // check if the character is "r" (in lowercase)
        // and rejoin the name, excluding all "r"s.
        // In essence, filter out "r"s from all names.
        changedName = n.split('').filter(char => char.toLowerCase() != 'r').join('')
        
        return changedName
    })
}

function makeNameUppercase(name) {
    return name.toUpperCase()
}

function padWithWhiteSpace(name) {
    return ` ${name} `
}

function trimWhiteSpaceOffName(name) {
    return name.trim()
}

function makeNameLowercase(name) {
    return name.toLowerCase()
}

console.log(processStrings())