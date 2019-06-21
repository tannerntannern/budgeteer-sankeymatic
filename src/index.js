// This includes all languages, but that's overkill for what we need
// import * as monaco from 'monaco-editor/esm/vs/editor/editor.main.js';

// This just imports the language support that we need
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
import 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main';

self.MonacoEnvironment = {
	getWorkerUrl: function (moduleId, label) {
		if (label === 'typescript' || label === 'javascript') {
			return './ts.worker.js';
		}
		return './editor.worker.js';
	},
};

window.monacoEditor = monaco.editor.create(document.getElementById('monaco-editor'), {
	value: '',
	language: 'typescript'
});
