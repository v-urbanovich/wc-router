import { Route } from './route';

type GenericObject<T> = { [key: string]: T };

export type NavigateOptions = {
    params?: GenericObject<string>;
    queryParams?: GenericObject<string | string[]>;
};

export class Router {
    get params(): GenericObject<string> {
        return { ...this.activeParams };
    }

    get queryParams(): GenericObject<string | string[]> {
        return { ...this.activeQueryParams };
    }

    private routes: Route[] = [];
    private onChangeListeners: Set<() => void> = new Set();

    private activeRoutes: Set<Route> = new Set();
    private activeParams: GenericObject<string> = {};
    private activeQueryParams: GenericObject<string | string[]> = {};
    private queryParamsDelimiter: string = '';

    constructor(private basePath: string = '/') {
        window.addEventListener('popstate', () => {
            this.updateState();
            for (const listener of this.onChangeListeners) {
                listener();
            }
        });
    }

    addRoute(route: Route): void {
        if (route.constructor !== Route) {
            throw new Error(`Route must be instance of Route class. Provided: ${route.constructor.name}`);
        }
        if (route.hasParent) {
            throw new Error(`Child routes can not be added`);
        }
        this.routes.push(route);
        this.updateState();
    }

    navigate(route: Route, options: NavigateOptions = {}): void {
        if (route.isAbstract) {
            console.warn('Can not navigate to abstract route. Navigation aborted');
            return;
        }
        const params: GenericObject<string> = options.params || {};
        const queryParams: GenericObject<string | string[]> = options.queryParams || {};
        const qsString: string = this.queryParamsToString(queryParams);
        const path: string[] = route.getPath();
        const newPath: string = path
            .map((part: string) => {
                if (!part.startsWith(':')) {
                    return part;
                }
                const key: string = part.slice(1);
                return String(params[key]);
            })
            .join('/');
        window.history.pushState({}, '', `${this.basePath}${newPath}${qsString ? '?' + qsString : ''}`);
        dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    }

    onChanges(callback: () => void): () => void {
        this.onChangeListeners.add(callback);
        return () => this.onChangeListeners.delete(callback);
    }

    isActive(route: Route): boolean {
        return this.activeRoutes.has(route);
    }

    setQPDelimiter(delimiter: string): void {
        this.queryParamsDelimiter = delimiter;
    }

    private updateState(): void {
        const path: string = location.pathname.replace(this.basePath, '');
        const newPath: string[] = path.split('/');
        this.setActiveRoutes(newPath);
        this.setActiveParams(newPath);
        this.parseQueryParams(location.search.slice(1));
    }

    private setActiveRoutes(path: string[]): void {
        let activeRoutes: Route[] | null = null;
        for (const route of this.routes) {
            activeRoutes = route.match(path);
            if (activeRoutes) {
                break;
            }
        }
        this.activeRoutes = new Set(activeRoutes || []);
    }

    private setActiveParams(path: string[]): void {
        if (!this.activeRoutes.size) {
            this.activeParams = {};
            return;
        }
        const params: GenericObject<string> = {};
        const lastActiveRoute: Route = Array.from(this.activeRoutes)[this.activeRoutes.size - 1];
        lastActiveRoute.getPath().forEach((part: string, index: number) => {
            if (!part.startsWith(':')) {
                return;
            }
            const key: string = part.slice(1);
            params[key] = path[index];
        });
        this.activeParams = params;
    }

    private parseQueryParams(searchString: string): void {
        const pairs: string[] = searchString.split('&');
        this.activeQueryParams = pairs.reduce((queryParams: GenericObject<string | string[]>, pair: string) => {
            const [key, value] = pair.split('=');
            const multiple: boolean =
                Boolean(key && value && this.queryParamsDelimiter) && value.includes(this.queryParamsDelimiter);
            if (multiple) {
                queryParams[key] = value.split(this.queryParamsDelimiter).filter((string: string) => Boolean(string));
            } else if (key && value) {
                queryParams[key] = value;
            }
            return queryParams;
        }, {});
    }

    private queryParamsToString(queryParams: GenericObject<string | string[]>): string {
        return Object.entries(queryParams).reduce((params: string, [key, value]) => {
            const stringValue: string = Array.isArray(value) ? value.join(this.queryParamsDelimiter) : value;
            if (key && value) {
                const pair: string = `${key}=${stringValue}`;
                params = params ? `${params}&${pair}` : pair;
            }
            return params;
        }, '');
    }
}
