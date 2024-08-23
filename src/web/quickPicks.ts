import * as vscode from 'vscode';
import { IProviderQuickPickItem } from './types';

export const USE_CUSTOM_VALUE = vscode.l10n.t('Use custom value...');

export function getProvider(
    recentProviders: IProviderQuickPickItem[],
    qp: vscode.QuickPick<IProviderQuickPickItem>
): Promise<IProviderQuickPickItem> {
	return new Promise((resolve, reject) => {
		qp.step = 1;
		qp.placeholder = vscode.l10n.t('Select authentication provider');

		qp.items = [
			...recentProviders,
			{
				label: USE_CUSTOM_VALUE
			}
		];

		const dispose = qp.onDidAccept(async () => {
			dispose.dispose();
			// Get the value
			let chosenItem: IProviderQuickPickItem;
			if (qp.selectedItems[0].description) {
				chosenItem = {
					label: qp.selectedItems[0].description,
				};
			} else if (qp.selectedItems[0].label === USE_CUSTOM_VALUE) {
				// need to prompt
				const url = await vscode.window.showInputBox({
					placeHolder: vscode.l10n.t('Enter provider to use')
				});
				if (!url) {
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

            if (chosenItem.requiredSetting) {
                const setting = vscode.workspace.getConfiguration().get<string>(chosenItem.requiredSetting);
                if (!setting) {
					vscode.window.showErrorMessage(vscode.l10n.t('The setting {0} is required to use this provider', chosenItem.requiredSetting));
                    reject(`The setting ${chosenItem.requiredSetting} is required to use this provider`);
                    return;
                }
            }

			resolve(chosenItem);
		});

		qp.show();
	});
}

export async function getScopeList(recentScopeLists: vscode.QuickPickItem[], qp: vscode.QuickPick<vscode.QuickPickItem>, provider: string): Promise<vscode.QuickPickItem> {
	return new Promise((resolve, reject) => {
		qp.step = 2;
		qp.placeholder = vscode.l10n.t('Select space-separated list of scopes for provider {0} (e.g. "scope1 scope2")', provider);
		qp.buttons = [vscode.QuickInputButtons.Back];
		qp.items = [
			...recentScopeLists,
			{
				label: USE_CUSTOM_VALUE
			}
		];

		const disposable = vscode.Disposable.from(
			qp.onDidTriggerButton((e) => {
				disposable.dispose();
				qp.buttons = [];
				reject('back');
			}),
			qp.onDidAccept(async () => {
				disposable.dispose();
				// Get the value
				let chosenItem: vscode.QuickPickItem;
				if (qp.selectedItems[0].description) {
					chosenItem = {
						label: qp.selectedItems[0].description,
					};
				} else if (qp.selectedItems[0].label === USE_CUSTOM_VALUE) {
					// need to prompt
					const url = await vscode.window.showInputBox({
						placeHolder: vscode.l10n.t('Enter space separated scope list to use')
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
			})
		);

		qp.show();
	});

}