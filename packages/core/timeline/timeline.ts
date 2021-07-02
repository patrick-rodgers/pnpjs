import { broadcast } from "./moments.js";
import { objectDefinedNotNull, isArray, isFunc } from "../util.js";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cloneDeep = require("lodash.clonedeep");

// TODO:: work on these typings some more for improvements
// TODO:: do we want to move to .env files, seems to be a sorta "norm" folks are using?

export type ObserverAddBehavior = "add" | "replace" | "prepend";

/**
 * Represents an observer that does not affect the timeline
 */
export type ObserverAction = (this: Timeline<any>, ...args: any[]) => void;

/**
 * Represents an observer with side effects within the timeline
 */
export type ObserverFunction<R = any> = (this: Timeline<any>, ...args: any[]) => Promise<R>;

/**
 * Defines the set of all valid observer types
 */
export type ValidObserver = ObserverAction | ObserverFunction;

/**
 * The set of moments that make up a timeline
 */
export type Moments = Record<string, (this: Timeline<any>, handlers: ValidObserver[], ...args: any[]) => void>;

/**
 * Represents the collection of observers
 */
export type ObserverCollection = Record<string, ValidObserver[]>;

/**
 * A type used to represent the proxied Timeline.on property
 */
type DistributeOn<T extends Moments, R extends Moments = T> =
    { [Prop in string & keyof T]: {
        (handler: Parameters<T[Prop]>[0][number]): Timeline<R>;
        toArray(): Parameters<T[Prop]>[0][number][];
        replace(handler: ValidObserver): Timeline<R>;
        prepend(handler: ValidObserver): Timeline<R>;
    }
    };

/**
 * A type used to represent the proxied Timeline.emit property
 */
type DistributeEmit<T extends Moments> =
    { [Prop in string & keyof T]: (...args: Parameters<Parameters<T[Prop]>[0][number]>) => ReturnType<Parameters<T[Prop]>[0][number]> };

/**
 * A type used to represent the proxied Timeline.clear property
 */
type DistributeClear<T extends Moments> =
    { [Prop in string & keyof T]: () => boolean };

/**
 * Virtual events that are present on all Timelines
 */
type DefaultTimelineEvents<T extends Moments> = {
    log: (observers: ((this: Timeline<T>, message: string, level: number) => void)[], ...args: any[]) => void;
    error: (observers: ((this: Timeline<T>, err: string | Error) => void)[], ...args: any[]) => void;
};

/**
 * The type combining the defined moments and DefaultTimelineEvents
 */
type OnProxyType<T extends Moments> = DistributeOn<T> & DistributeOn<DefaultTimelineEvents<T>, T>;

/**
 * The type combining the defined moments and DefaultTimelineEvents
 */
type EmitProxyType<T extends Moments> = DistributeEmit<T> & DistributeEmit<DefaultTimelineEvents<T>>;

/**
 * The type combining the defined moments and DefaultTimelineEvents
 */
type ClearProxyType<T extends Moments> = DistributeClear<T> & DistributeClear<DefaultTimelineEvents<T>>;

/**
 * Timeline represents a set of operations executed in order of definition,
 * with each moment's behavior controlled by the implementing function
 */
export abstract class Timeline<T extends Moments> {

    private _inheritingObservers: boolean;
    private _parentObservers: ObserverCollection;
    private _onProxy: typeof Proxy | null = null;
    private _emitProxy: typeof Proxy | null = null;
    private _clearProxy: typeof Proxy | null = null;
    private _asyncOverride = false;

    constructor(protected readonly moments: T, protected observers?: ObserverCollection) {

        // TODO:: this work isn't correct
        if (objectDefinedNotNull(this.observers)) {
            this._inheritingObservers = true;
        } else {
            this._inheritingObservers = false;
            this.observers = {};
        }
    }

    public get AsyncOverride(): boolean {
        return this._asyncOverride;
    }

    public set AsyncOverride(value: boolean) {
        this._asyncOverride = value;
    }

    /**
     * Property allowing access to subscribe observers to all the moments within this timeline
     */
    public get on(): OnProxyType<T> {

        if (this._onProxy === null) {
            this._onProxy = new Proxy(this, {
                get: (target: any, p: string) => Object.assign((handler: ValidObserver) => {

                    // // TODO:: we might need better logic here depending on how objects are constructed
                    if (this._inheritingObservers) {
                        // ONLY clone the observers the first time this instance of timeline sets an observer
                        // this should work all up and down the tree.
                        this._parentObservers = target.observers;
                        target.observers = cloneDeep(target.observers);
                        this._inheritingObservers = false;
                    }

                    addObserver(target.observers, p, handler, "add");
                    return target;
                }, {
                    toArray: (): ValidObserver[] => {
                        return Reflect.has(target.observers, p) ? cloneDeep(Reflect.get(target.observers, p)) : [];
                    },
                    replace: (handler: ValidObserver) => {
                        addObserver(target.observers, p, handler, "replace");
                        return target;
                        // Reflect.set(target, `__once${p}`, handler);
                    },
                    prepend: (handler: ValidObserver) => {
                        addObserver(target.observers, p, handler, "prepend");
                        return target;
                        // Reflect.set(target, `__once${p}`, handler);
                    },
                }),
            });
        }

        return <any>this._onProxy;
    }

    /**
     * Property allowing access to subscribe observers to all the moments within this timline
     */
    public get clear(): ClearProxyType<T> {

        if (this._clearProxy === null) {
            this._clearProxy = new Proxy(this, {
                get: (target: any, p: string) => () => {

                    if (Reflect.has(target.observers, p)) {
                        // we trust outselves that this will be an array
                        (<ObserverCollection>target.observers)[p].length = 0;
                        return true;
                    }

                    return false;
                },
            });
        }

        return <any>this._clearProxy;
    }

    /**
     * Shorthand method to emit a logging event tied to this timeline
     *
     * @param message The message to log
     * @param level The level at which the message applies
     */
    public log(message: string, level: number): void {
        this.emit.log(message, level);
    }

    // TODO:: WIP to correctly enable this capability
    public resetObservers(): void {
        if (!this._inheritingObservers && objectDefinedNotNull(this._parentObservers)) {
            this.observers = this._parentObservers;
            this._inheritingObservers = true;
            this._parentObservers = null;
        }
    }

    /**
     * Property allowing access to invoke a moment from within this timeline
     */
    protected get emit(): EmitProxyType<T> {

        if (this._emitProxy === null) {
            this._emitProxy = new Proxy(this, {
                get: (target: any, p: string) => (...args: any[]) => {

                    // check for once
                    if (Reflect.has(target, `__once${p}`)) {
                        const onceHandler = target[`__once${p}`];
                        delete target[`__once${p}`];
                        console.log("here");
                    }

                    // handle the case there are no observers registered to the target
                    const observers = Reflect.has(target.observers, p) ? Reflect.get(target.observers, p) : [];

                    if (p === "error" && (!isArray(observers) || observers.length < 1)) {

                        // if we are emitting an error, and no error observers are defined, we throw
                        throw Error(`Unhandled Exception: ${args[0]}`);
                    }

                    try {

                        // default to broadcasting any events without specific impl (will apply to defaults)
                        const moment = Reflect.has(target.moments, p) ? Reflect.get(target.moments, p) : broadcast();

                        return Reflect.apply(moment, this, [observers, ...args]);

                    } catch (e) {

                        if (p !== "error") {
                            this.emit.error(e);
                        } else {
                            // if all else fails, re-throw as we are getting errors out of error observers meaning someting is sideways
                            throw e;
                        }
                    }
                },
            });
        }

        return <any>this._emitProxy;
    }

    protected abstract execute(init?: RequestInit): Promise<any>;
}

/**
 * Adds an observer to a given target
 *
 * @param target The object to which events are registered
 * @param moment The name of the moment to which the observer is registered
 * @param prepend If true the observer is prepended to the collection (default: false)
 *
 */
function addObserver(target: Record<string, any>, moment: string, observer: ValidObserver, addBehavior: ObserverAddBehavior = "add"): any[] {

    if (!isFunc(observer)) {
        throw Error("Observers must be functions.");
    }

    if (!Reflect.has(target, moment)) {

        // if we don't have a registration for this moment, then we just add a new prop
        Reflect.defineProperty(target, moment, {
            value: [observer],
            configurable: true,
            enumerable: true,
            writable: true,
        });

    } else {

        // if we have an existing property then we follow the specified behavior
        switch (addBehavior) {
            case "add":
                target[moment].push(observer);
                break;
            case "prepend":
                target[moment].unshift(observer);
                break;
            case "replace":
                target[moment].length = 0;
                target[moment].push(observer);
                break;
        }
    }

    return target[moment];
}
