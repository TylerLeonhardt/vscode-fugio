import * as vscode from "vscode";

export class DisposableStore extends vscode.Disposable {
	private _toDispose = new Set<vscode.Disposable>();

	constructor() {
		super(() => this.clear());
	}

	public add<T extends vscode.Disposable>(t: T): T {
		if (this._toDispose.has(t)) {
			throw new Error('DisposableStore already has disposable.');
		}
		this._toDispose.add(t);
		return t;
	}

	public clear() {
		this._toDispose.forEach(d => d.dispose());
		this._toDispose.clear();
	}
}

/**
 * Abstract base class for a {@link IDisposable disposable} object.
 *
 * Subclasses can {@linkcode _register} disposables that will be automatically cleaned up when this object is disposed of.
 */
export abstract class Disposable implements vscode.Disposable {

	/**
	 * A disposable that does nothing when it is disposed of.
	 *
	 * TODO: This should not be a static property.
	 */
	static readonly None = Object.freeze<vscode.Disposable>({ dispose() { } });

	protected readonly _store = new DisposableStore();

	public dispose(): void {
		this._store.dispose();
	}

	/**
	 * Adds `o` to the collection of disposables managed by this object.
	 */
	protected _register<T extends vscode.Disposable>(o: T): T {
		if ((o as unknown as Disposable) === this) {
			throw new Error('Cannot register a disposable on itself!');
		}
		return this._store.add(o);
	}
}
