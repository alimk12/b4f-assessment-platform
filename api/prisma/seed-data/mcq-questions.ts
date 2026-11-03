type Q = { text: string; options: string[]; correct: number };

export const IQ_QUESTIONS: Q[] = [
  { text: 'Which number comes next: 2, 4, 8, 16, ?', options: ['24', '32', '18', '30'], correct: 1 },
  { text: 'Which number comes next: 1, 1, 2, 3, 5, 8, ?', options: ['11', '12', '13', '15'], correct: 2 },
  { text: 'Book is to reading as fork is to ...', options: ['drawing', 'writing', 'eating', 'stirring'], correct: 2 },
  { text: 'Which word does not belong: apple, banana, carrot, mango?', options: ['apple', 'banana', 'carrot', 'mango'], correct: 2 },
  { text: 'If all Bloops are Razzies and all Razzies are Lazzies, then all Bloops are ...', options: ['Lazzies', 'not Lazzies', 'Razzies only', 'impossible to tell'], correct: 0 },
  { text: 'Which number comes next: 3, 6, 11, 18, 27, ?', options: ['36', '38', '40', '35'], correct: 1 },
  { text: 'A clock shows 3:15. What is the angle between the hour and minute hands?', options: ['0°', '7.5°', '15°', '30°'], correct: 1 },
  { text: 'Which letter comes next: A, C, F, J, O, ?', options: ['T', 'U', 'S', 'V'], correct: 1 },
  { text: 'If 5 machines make 5 items in 5 minutes, how long do 100 machines take to make 100 items?', options: ['100 minutes', '20 minutes', '5 minutes', '1 minute'], correct: 2 },
  { text: 'Which shape has the most sides?', options: ['Pentagon', 'Hexagon', 'Octagon', 'Heptagon'], correct: 2 },
  { text: 'Mary is older than Sam. Sam is older than Lea. Who is the youngest?', options: ['Mary', 'Sam', 'Lea', 'Cannot tell'], correct: 2 },
  { text: 'Which number is missing: 7, 14, ?, 28, 35', options: ['20', '21', '22', '24'], correct: 1 },
];

export const HTML_CSS_QUESTIONS: Q[] = [
  { text: 'Which HTML element is used for the largest heading?', options: ['<head>', '<h6>', '<h1>', '<header>'], correct: 2 },
  { text: 'Which attribute gives an image its alternative text?', options: ['title', 'alt', 'src', 'name'], correct: 1 },
  { text: 'Which CSS property changes the text color?', options: ['font-color', 'text-color', 'color', 'foreground'], correct: 2 },
  { text: 'Which value of display places children in a flexible row or column?', options: ['block', 'inline', 'flex', 'table'], correct: 2 },
  { text: 'Which selector targets an element with id="main"?', options: ['.main', '#main', 'main', '*main'], correct: 1 },
  { text: 'In the box model, which property is the space inside the border?', options: ['margin', 'padding', 'outline', 'gap'], correct: 1 },
  { text: 'Which HTML element creates a link?', options: ['<link>', '<a>', '<href>', '<nav>'], correct: 1 },
  { text: 'Which unit is relative to the root element font size?', options: ['em', 'px', 'rem', '%'], correct: 2 },
  { text: 'Which position value keeps an element fixed while the page scrolls?', options: ['relative', 'absolute', 'static', 'fixed'], correct: 3 },
  { text: 'Which element is the correct place for the page title shown in the browser tab?', options: ['<title> inside <head>', '<h1> inside <body>', '<meta name="title">', '<header>'], correct: 0 },
  { text: 'Which CSS rule makes a grid with three equal columns?', options: ['grid-columns: 3', 'grid-template-columns: repeat(3, 1fr)', 'columns: 3fr', 'display: grid-3'], correct: 1 },
  { text: 'Which input type shows a field for email addresses?', options: ['type="mail"', 'type="text-email"', 'type="email"', 'type="address"'], correct: 2 },
];
