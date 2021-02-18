export class Route {
    get hasParent(): boolean {
        return Boolean(this.parent);
    }

    get isAbstract(): boolean {
        return this.abstract;
    }

    private children: Route[] = [];
    private parent: Route | null = null;
    private readonly path: string[];

    constructor(path: string, private readonly abstract: boolean = false) {
        if (path.startsWith('/')) {
            path = path.replace('/', '');
        }
        this.path = path.split('/');
    }

    addChild(path: string, abstract: boolean = false): Route {
        const newRoute: Route = new Route(path, abstract);
        this.children.push(newRoute);
        newRoute.setParent(this);
        return newRoute;
    }

    setParent(route: Route): void {
        if (!route.hasChild(this)) {
            throw new Error('Child is missing in parent route!');
        }
        this.parent = route;
    }

    hasChild(route: Route): boolean {
        return this.children.includes(route);
    }

    getPath(): string[] {
        const parentPath: string[] = this.parent ? this.parent.getPath() : [];
        return [...parentPath, ...this.path];
    }

    match(path: string[]): Route[] | null {
        const currentParts: string[] = path.slice(0, this.path.length);
        const rest: string[] = path.slice(this.path.length);
        const currentMatches: boolean = this.path.every(
            (part: string, index: number) =>
                currentParts[index] !== undefined && (part.startsWith(':') || part === currentParts[index])
        );
        if (!currentMatches) {
            return null;
        }
        if (rest.length) {
            let matchedChild: Route[] | null = null;
            for (const child of this.children) {
                matchedChild = child.match(rest);
                if (matchedChild) {
                    break;
                }
            }
            return matchedChild ? [this, ...matchedChild] : null;
        } else {
            return [this];
        }
    }
}
