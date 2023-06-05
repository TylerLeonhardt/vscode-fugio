// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

function getProvider(recentProviders: vscode.QuickPickItem[], qp: vscode.QuickPick<vscode.QuickPickItem>): Promise<vscode.QuickPickItem> {
	return new Promise((resolve, reject) => {
		qp.step = 1;
		qp.title = 'Select authentication provider';

		qp.items = [
			...recentProviders,
			{
				label: 'Use custom value...'
			}
		];

		const dispose = qp.onDidAccept(async () => {
			qp.hide();
			// Get the value
			let chosenItem: vscode.QuickPickItem;
			if (qp.selectedItems[0].description) {
				chosenItem = {
					label: qp.selectedItems[0].description,
				};
			} else if (qp.selectedItems[0].label === 'Use custom value...') {
				// need to prompt
				const url = await vscode.window.showInputBox({
					placeHolder: 'Enter provider to use'
				});
				if (!url) {
					dispose.dispose();
					reject('No provider entered');
					return;
				} else {
					chosenItem = {
						label: url,
					};
				}
			} else {
				chosenItem = qp.selectedItems[0];
			}

			dispose.dispose();
			resolve(chosenItem);
		});

		qp.show();
	});
}

async function getScopeList(recentScopeLists: vscode.QuickPickItem[], qp: vscode.QuickPick<vscode.QuickPickItem>, provider: string): Promise<vscode.QuickPickItem> {
	return new Promise((resolve, reject) => {
		qp.step = 2;
		qp.title = 'Select space-separated list of scopes';
		
		qp.items = [
			...recentScopeLists,
			{
				label: 'Use custom value...'
			}
		];

		qp.onDidAccept(async () => {
			qp.hide();
			// Get the value
			let chosenItem: vscode.QuickPickItem;
			if (qp.selectedItems[0].description) {
				chosenItem = {
					label: qp.selectedItems[0].description,
				};
			} else if (qp.selectedItems[0].label === 'Use custom value...') {
				// need to prompt
				const url = await vscode.window.showInputBox({
					placeHolder: 'Enter space separated scope list to use'
				});
				if (!url) {
					reject('No scope list entered');
					return;
				} else {
					chosenItem = {
						label: url,
					};
				}
			} else {
				chosenItem = qp.selectedItems[0];
			}
			
			resolve(chosenItem);
		});

		qp.show();
	});

}

async function updateGlobalState(context: vscode.ExtensionContext, recents: vscode.QuickPickItem[], chosenItem: vscode.QuickPickItem, key: string) {
	const indexToRemove = recents.findIndex(item => item.label === chosenItem.label);
	if (indexToRemove > -1) {
		recents.splice(indexToRemove, 1);
	}
	recents.unshift(chosenItem);
	if (recents.length > 10) {
		recents.splice(10, recents.length - 10);
	}
	await context.globalState.update(key, recents);
}

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('fugio.mintToken', async () => {
		const qp = vscode.window.createQuickPick();
		qp.totalSteps = 2;
		qp.matchOnDescription = true;
		
		qp.onDidChangeValue((e: string) => {
			if (e.length) {
				qp.items.find(i => i.label === 'Use custom value...')!.description = e;
				qp.items = qp.items;
			}
		});

		const recentProviders = context.globalState.get<vscode.QuickPickItem[]>('recent-providers') ?? [
			{ label: 'github' }, { label: 'microsoft' }
		];
		const chosenProvider = await getProvider(recentProviders, qp);

		const recentScopeLists = context.globalState.get<vscode.QuickPickItem[]>(`${chosenProvider.label}-scopelists`) ?? [];
		const chosenScopeList = await getScopeList(recentScopeLists, qp, chosenProvider.label);
		const scopes = chosenScopeList.label.split(' ');

		const session = await vscode.authentication.getSession(chosenProvider.label, scopes, { createIfNone: true, clearSessionPreference: true });

		await updateGlobalState(context, recentProviders, chosenProvider, 'recent-providers');
		await updateGlobalState(context, recentScopeLists, chosenScopeList, `${chosenProvider.label}-scopelists`);

		const copyAccess = vscode.l10n.t('Copy access token');
		const copyId = vscode.l10n.t('Copy id token');
		const buttons = (session as any).idToken ? [copyAccess, copyId] : [copyAccess];
		let copyResult: string | undefined;
		do {
			copyResult = await vscode.window.showInformationMessage(`Your token for scopes "${session.scopes.join(' ')}" is ready!`, ...buttons);
			if (copyResult === copyAccess) {
				vscode.env.clipboard.writeText(session.accessToken);
			} else if (copyResult === copyId) {
				vscode.env.clipboard.writeText((session as any).idToken);
			}
			if (!(session as any).idToken) {
				copyResult = undefined;
			}
		} while(copyResult);
	});

	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('fugio.clearRecents', async () => {
		const recentProviders = context.globalState.get<vscode.QuickPickItem[]>('recent-providers');
		if (!recentProviders?.length) {
			return;
		}

		for (const provider of recentProviders) {
			await context.globalState.update(`${provider.label}-scopelists`, undefined);
		}

		await context.globalState.update('recent-providers', undefined);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
