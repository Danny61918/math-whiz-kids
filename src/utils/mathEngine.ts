import type { GameSettings } from '../store/useGameStore';

export interface Question {
    leftOperand: number;
    rightOperand: number;
    operator: '+' | '-' | '*' | '/';
    correctAnswer: number;
    correctRemainder?: number;
}

function getInterestingInt(digits: number, options: { avoidZero?: boolean, avoidTrailingZero?: boolean, avoidOne?: boolean, favorHard?: boolean } = {}): number {
    const { avoidZero = true, avoidTrailingZero = true, avoidOne = true, favorHard = true } = options;

    if (digits === 1) {
        // Pool weighted towards harder digits (6, 7, 8, 9)
        let pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        if (avoidZero) pool = pool.filter(n => n !== 0);
        if (avoidOne && pool.length > 1) pool = pool.filter(n => n !== 1);
        
        if (favorHard) {
            // Duplicate 6, 7, 8, 9 to increase their probability
            const hard = [6, 7, 8, 9];
            pool = [...pool, ...hard, ...hard]; // Harder numbers are now more likely
        }
        
        return pool[Math.floor(Math.random() * pool.length)];
    }

    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;

    let res;
    let attempts = 0;
    do {
        res = Math.floor(Math.random() * (max - min + 1)) + min;
        
        // If favorHard is on for multi-digits, we check if it has "hard" digits
        if (favorHard && attempts < 20) {
            const digitsStr = res.toString();
            const hardDigitCount = (digitsStr.match(/[6789]/g) || []).length;
            if (hardDigitCount < digits / 2) {
                attempts++;
                continue; // Try again to get more hard digits
            }
        }

        if (avoidTrailingZero && res % 10 === 0 && attempts < 20) {
            attempts++;
            continue;
        }
        break;
    } while (attempts < 50);

    return res;
}

function requiresCarrying(a: number, b: number): boolean {
    const s1 = a.toString().split('').reverse();
    const s2 = b.toString().split('').reverse();
    const len = Math.max(s1.length, s2.length);
    for (let i = 0; i < len; i++) {
        const d1 = parseInt(s1[i] || '0');
        const d2 = parseInt(s2[i] || '0');
        if (d1 + d2 >= 10) return true;
    }
    return false;
}

function requiresBorrowing(a: number, b: number): boolean {
    const s1 = a.toString().split('').reverse();
    const s2 = b.toString().split('').reverse();
    // Subtraction a - b where a >= b
    for (let i = 0; i < s2.length; i++) {
        const d1 = parseInt(s1[i] || '0');
        const d2 = parseInt(s2[i] || '0');
        if (d1 < d2) return true;
    }
    return false;
}

const questionHistory: string[] = [];

export function generateQuestion(settings: GameSettings): Question {
    const { operations, leftDigits, rightDigits } = settings;
    const operator = operations[Math.floor(Math.random() * operations.length)];

    let left = 0;
    let right = 0;
    let answer = 0;
    let correctRemainder: number | undefined = undefined;

    let attempts = 0;
    let questionKey = '';
    let isDuplicate = false;

    do {
        isDuplicate = false;
        attempts = 0;

    switch (operator) {
        case '+':
            do {
                left = getInterestingInt(leftDigits);
                right = getInterestingInt(rightDigits);
                attempts++;
            } while (attempts < 50 && leftDigits >= 2 && rightDigits >= 2 && !requiresCarrying(left, right));
            answer = left + right;
            break;
        case '-':
            do {
                left = getInterestingInt(leftDigits);
                right = getInterestingInt(rightDigits);
                if (left < right) [left, right] = [right, left];
                attempts++;
            } while (attempts < 50 && (left === right || (leftDigits >= 2 && rightDigits >= 2 && !requiresBorrowing(left, right))));
            // Fallback if they are equal after 50 attempts (rare)
            if (left === right) left += 1;
            answer = left - right;
            break;
        case '*':
            left = getInterestingInt(leftDigits, { avoidOne: true, favorHard: true });
            right = getInterestingInt(rightDigits, { avoidOne: true, favorHard: true });
            answer = left * right;
            break;
        case '/':
            // Ensure non-trivial divisor
            right = getInterestingInt(rightDigits, { avoidOne: true, favorHard: true });
            // Quotient should also be interesting
            const quotient = getInterestingInt(Math.max(1, leftDigits - rightDigits + 1), { avoidOne: true, favorHard: true });
            
            // Generate remainder: 1 to right-1 (strictly avoiding 0 remainder for more challenge if possible, 
            // unless right is 1 which we already avoid)
            let r = 0;
            if (right > 1) {
                // 90% chance to have a non-zero remainder if possible
                if (Math.random() < 0.9) {
                    r = Math.floor(Math.random() * (right - 1)) + 1;
                }
            }
            
            left = quotient * right + r;
            answer = quotient;
            correctRemainder = r;
            break;
    }

        questionKey = `${left}${operator}${right}`;
        if (questionHistory.includes(questionKey)) {
            isDuplicate = true;
        } else {
            questionHistory.push(questionKey);
            if (questionHistory.length > 20) {
                questionHistory.shift();
            }
        }
    } while (isDuplicate);

    return {
        leftOperand: left,
        rightOperand: right,
        operator,
        correctAnswer: answer,
        correctRemainder,
    };
}
