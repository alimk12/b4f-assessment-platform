type Case = { visibility: 'SAMPLE' | 'HIDDEN'; args: unknown[]; expected: unknown };
type P = { title: string; description: string; functionName: string; points: number; testCases: Case[] };

export const CODING_PROBLEMS: P[] = [
  {
    title: 'Two Sum',
    description:
      'Write a function twoSum(nums, target) that returns the indexes [i, j] (i < j) of the two numbers in nums that add up to target. There is always exactly one answer.',
    functionName: 'twoSum',
    points: 50,
    testCases: [
      { visibility: 'SAMPLE', args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { visibility: 'HIDDEN', args: [[3, 2, 4], 6], expected: [1, 2] },
      { visibility: 'HIDDEN', args: [[3, 3], 6], expected: [0, 1] },
      { visibility: 'HIDDEN', args: [[1, 5, 9, 2], 14], expected: [1, 2] },
      { visibility: 'HIDDEN', args: [[-4, 8, 10, 1], 6], expected: [0, 2] },
    ],
  },
  {
    title: 'Reverse Words',
    description:
      'Write a function reverseWords(sentence) that returns the words of the sentence in reverse order, separated by single spaces. Extra spaces between words must disappear.',
    functionName: 'reverseWords',
    points: 50,
    testCases: [
      { visibility: 'SAMPLE', args: ['hello world'], expected: 'world hello' },
      { visibility: 'HIDDEN', args: ['the sky is blue'], expected: 'blue is sky the' },
      { visibility: 'HIDDEN', args: ['  many   spaces  here '], expected: 'here spaces many' },
      { visibility: 'HIDDEN', args: ['single'], expected: 'single' },
      { visibility: 'HIDDEN', args: ['a b c d'], expected: 'd c b a' },
    ],
  },
];
