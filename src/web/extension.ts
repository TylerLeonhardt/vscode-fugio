// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DisposableStore } from './utils';
import { registerMintTokenCommand } from './commands/mintTokenCommand';
import { registerClearRecentsCommand } from './commands/clearRecentsCommand';
import { registerInspectAccountsCommand } from './commands/inspectAccountsCommand';

export function activate(context: vscode.ExtensionContext) {
	const store = new DisposableStore();
	context.subscriptions.push(store);
	registerMintTokenCommand(context.globalState, store);
	registerClearRecentsCommand(context.globalState, store);
	registerInspectAccountsCommand(context.globalState, store);
}

export function deactivate() {}
