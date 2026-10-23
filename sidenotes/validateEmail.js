const emails = [
    "warren@west.com",  // true
    "warren@west.co.za",// true
    "@west.com",        // false
    "west@.com",        // false
    "warren @west.com", // false
    "warren@west",      // false
    "warren@west.c",    // false
    "warren@west.co.z", // false
    "warren.com",       // false
]

function isValidEmail(email) {
    // first trim any whitespace
    email.trim()

    // reject if there's any whitespace inside the email
    if (email.includes(' ')) {
        return false
    }

    // Check if there's an '@'
    const splitEmail = email.split('@')

    // check that there's something before and after an '@'  
    if (splitEmail.length < 2) {
        return false
    }

    // check if the length of the stuff before the '@' is more than 0 characters
    if (splitEmail[0].length < 1) {
        return false
    }

    // check if there's a '.' after the '@'
    const splitSecondPart = splitEmail[1].split('.')
    
    // check that there's at least a piece 
    if (splitSecondPart.length < 2) {
        return false
    }

    // check that the stuff before the '.' is at least 1 character
    if (splitSecondPart[0].length < 1) {
        return false
    }

    if (splitSecondPart.length > 2 && splitSecondPart[2].length < 2) {
        return false
    }

    // check that the stuff after the '.' is at least 2 characters
    if (splitSecondPart[1].length < 2) {
        return false
    }

    return true
}

// for (let e of emails) {
//     console.log(isValidEmail(e))
// }

module.exports = isValidEmail