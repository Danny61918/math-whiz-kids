import type { GameSettings } from '../store/useGameStore';

export interface Question {
    leftOperand: number;
    rightOperand: number;
    operator: '+' | '-' | '*' | '/';
    correctAnswer: number;
}

function getRandomInt(digits: number): number {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    // Handle 1 digit case specifically to allow 0-9? Or just 1-9? 
    // For simplicity and avoiding leading zeros issue, let's say 1 digit is 1-9.
    // Actually, for kids, 0 is valid.
    if (digits === 1) return Math.floor(Math.random() * 10);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateQuestion(settings: GameSettings): Question {
    const { operations, leftDigits, rightDigits } = settings;
    const operator = operations[Math.floor(Math.random() * operations.length)];

    let left = getRandomInt(leftDigits);
    let right = getRandomInt(rightDigits);
    let answer = 0;

    switch (operator) {
        case '+':
            answer = left + right;
            break;
        case '-':
            // Ensure non-negative result
            if (left < right) {
                [left, right] = [right, left];
            }
            answer = left - right;
            break;
        case '*':
            answer = left * right;
            break;

            // But we need to respect 'leftDigits' and 'rightDigits' from settings if possible.
            // This is tricky for division. Let's simplify:
            // Divisor (right) is usually smaller. Dividend (left) is larger.

            if (right === 0) right = 1;
            const quotient = getRandomInt(Math.max(1, leftDigits - rightDigits + 1)); // Rough estimate

            // Re-calculate left to ensure it's a clean division
            left = quotient * right;
            answer = quotient;
            break;
    }

    return {
        leftOperand: left,
        rightOperand: right,
        operator,
        correctAnswer: answer,
    };
}
