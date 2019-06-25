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

// TODO: this will not work long-term
monaco.languages.typescript.typescriptDefaults.addExtraLib(
`declare type Supply = 'supply';
declare type Consumer = 'consumer';
declare type Pipe = 'pipe';
declare type Supplyable = Consumer | Pipe;
declare type Consumable = Supply | Pipe;
declare type NodeType = Supply | Consumer | Pipe;
declare type To<T extends NodeType = Consumable> = {
    to: (node: Node<Supplyable>) => Node<T>;
};
declare type From<T extends NodeType = Supplyable> = {
    from: (node: Node<Consumable>) => Node<T>;
};
declare type NodeBase = {
    name: string;
    type: NodeType;
};
declare type Node<T extends NodeType = NodeType> = NodeBase & (T extends Consumable ? {
    supplies: (amount: number, multiplier?: number) => To<T>;
    suppliesAsMuchAsNecessary: () => To<T>;
    suppliesAsMuchAsPossible: () => To<T>;
} : {}) & (T extends Supplyable ? {
    consumes: (amount: number, multiplier?: number) => From<T>;
    consumesAsMuchAsNecessary: () => From<T>;
    consumesAsMuchAsPossible: () => From<T>;
} : {});
/**
 * Clears all nodes, relationships, and constraints, and resets the kiwi.js solver.
 */
declare const reset: () => void;
/**
 * Creates a supply node.
 */
declare function supply(name: string, capacity: number, multiplier?: number): Node<Supply>;
/**
 * Creates a consumer node.
 */
declare function consumer(name: string): Node<Consumer>;
/**
 * Creates a pipe node.
 */
declare function pipe(name: string): Node<Pipe>;
/**
 * Resolves the balances and tranfers of the network.
 */
declare function solve(): {
    allNodes: Node<NodeType>[];
    transfers: TwoKeyMap<Node<NodeType>, number>;
    balances: Map<Node<NodeType>, number>;
};`, '@tannerntannern/budgeteer/dist/resources.d.ts');

window.monacoEditor = monaco.editor.create(document.getElementById('monaco-editor'), {
	value:
`// see https://github.com/tannerntannern/budgeteer for help

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
