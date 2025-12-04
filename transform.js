// transform.js
// מוסיף את הדומיין "whizmanage" לקריאות __(), _x(), _n() בקבצי JS/JSX
const DOMAIN = 'whizmanage';

export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // __()
  root.find(j.CallExpression, {
    callee: { type: 'Identifier', name: '__' },
  }).forEach(path => {
    const args = path.value.arguments;
    if (args.length === 1) args.push(j.literal(DOMAIN));
  });

  // _x()
  root.find(j.CallExpression, {
    callee: { type: 'Identifier', name: '_x' },
  }).forEach(path => {
    const args = path.value.arguments;
    if (args.length === 2) args.push(j.literal(DOMAIN));
  });

  // _n()
  root.find(j.CallExpression, {
    callee: { type: 'Identifier', name: '_n' },
  }).forEach(path => {
    const args = path.value.arguments;
    if (args.length === 3) args.push(j.literal(DOMAIN));
  });

  return root.toSource();
}
