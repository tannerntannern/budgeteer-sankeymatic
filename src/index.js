// This includes all languages, but that's overkill for what we need
// import * as monaco from 'monaco-editor/esm/vs/editor/editor.main.js';

// This just imports the language support that we need
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
import 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main';

// make budgeteer functions available on the window
import { supply, consumer, pipe, solve, reset } from '@tannerntannern/budgeteer';
window.supply = supply;
window.consumer = consumer;
window.pipe = pipe;
window.solve = solve;
window.reset = reset;

self.MonacoEnvironment = {
	getWorkerUrl: function (moduleId, label) {
		if (label === 'typescript' || label === 'javascript') {
			return './ts.worker.js';
		}
		return './editor.worker.js';
	},
};

// TODO: 
// monaco.languages.typescript.javascriptDefaults.addExtraLib();
// window.monaco = monaco;

window.monacoEditor = monaco.editor.create(document.getElementById('monaco-editor'), {
	value:
`// see https://github.com/tannerntannern/budgeteer for help!
// (the highlighting errors will be fixed soon)

const wages = supply('Wages', 2500);
const checking = pipe('Checking');
const expenses = pipe('Expenses');

wages
	.supplies(700).to(consumer('Taxes'))
	.supplies(1200).to(checking)
	.suppliesAsMuchAsPossible().to(consumer('Savings'));

checking
	.suppliesAsMuchAsNecessary().to(expenses)
	.suppliesAsMuchAsPossible().to(consumer('Spending Money'));

consumer('Rent').consumes(900).from(expenses);
consumer('Groceries').consumes(200).from(expenses);`,
	language: 'typescript'
});

window.processBudgeteer = function () {
	reset();
	eval(window.monacoEditor.getValue());

	try {
		let transfers = solve().transfers;
		let sankeymaticString = '';
		transfers.forEach((node1, node2, value) => sankeymaticString += `${node1.name} [${value.toFixed(2)}] ${node2.name}\n`);

		document.getElementById('flows_in').value = sankeymaticString;
		window.process_sankey();
	} catch (e) {
		alert(e.message);
	}
};

window.processBudgeteer();
