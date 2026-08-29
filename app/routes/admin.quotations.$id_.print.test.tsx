import { StrictMode, act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const { waitForPrintReadinessMock, searchParamsMock, loaderData } = vi.hoisted(() => ({
  waitForPrintReadinessMock: vi.fn(),
  searchParamsMock: new URLSearchParams("autoprint=1"),
  loaderData: {
    quotation: {
      id: 42,
      title: "Quote",
      issuedAt: "2026-08-29T00:00:00.000Z",
      client: { name: "Client", location: null, document: null },
      lines: [],
      paymentOptions: [],
      notes: null,
    },
    rep: {
      brandPerson: "Rep",
      phone: "(11) 99999-9999",
      city: "Cidade",
      email: "rep@example.com",
    },
  },
}));

vi.mock("~/utils/print-readiness", () => ({
  waitForPrintReadiness: waitForPrintReadinessMock,
}));
vi.mock("~/components/ui/button", () => ({
  Button: ({ asChild, children, ...props }: any) => (asChild ? children : <button {...props}>{children}</button>),
}));
vi.mock("~/components/admin/QuotationDocument", () => ({
  QuotationDocument: () => <div className="quote-stage" />,
}));
vi.mock("@remix-run/react", () => ({
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  useLoaderData: () => loaderData,
  useSearchParams: () => [searchParamsMock, vi.fn()],
}));
vi.mock("~/models/quotation.server", () => ({
  getQuotation: vi.fn(),
}));
vi.mock("~/utils/require-admin.server", () => ({
  requireAdmin: vi.fn(),
}));

class MiniNode {
  parentNode: MiniNode | null = null;
  childNodes: MiniNode[] = [];
  ownerDocument: MiniDocument | null = null;

  appendChild<T extends MiniNode>(node: T): T {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
    this.childNodes.push(node);
    node.parentNode = this;
    node.ownerDocument = this.ownerDocument;
    return node;
  }

  insertBefore<T extends MiniNode>(node: T, before: MiniNode | null): T {
    if (!before) return this.appendChild(node);
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
    const index = this.childNodes.indexOf(before);
    if (index === -1) return this.appendChild(node);
    this.childNodes.splice(index, 0, node);
    node.parentNode = this;
    node.ownerDocument = this.ownerDocument;
    return node;
  }

  removeChild<T extends MiniNode>(node: T): T {
    const index = this.childNodes.indexOf(node);
    if (index !== -1) {
      this.childNodes.splice(index, 1);
      node.parentNode = null;
    }
    return node;
  }

  get firstChild() {
    return this.childNodes[0] ?? null;
  }

  get textContent(): string {
    return this.childNodes.map((node) => node.textContent).join("");
  }

  set textContent(value: string) {
    this.childNodes = value ? [new MiniText(value, this.ownerDocument)] : [];
    for (const child of this.childNodes) {
      child.parentNode = this;
    }
  }
}

class MiniText extends MiniNode {
  nodeType = 3;
  nodeName = "#text";

  constructor(public data: string, ownerDocument: MiniDocument | null) {
    super();
    this.ownerDocument = ownerDocument;
  }

  get textContent() {
    return this.data;
  }

  set textContent(value: string) {
    this.data = value;
  }
}

class MiniComment extends MiniNode {
  nodeType = 8;
  nodeName = "#comment";

  constructor(public data: string, ownerDocument: MiniDocument | null) {
    super();
    this.ownerDocument = ownerDocument;
  }

  get textContent() {
    return this.data;
  }

  set textContent(value: string) {
    this.data = value;
  }
}

class MiniElement extends MiniNode {
  nodeType = 1;
  namespaceURI = "http://www.w3.org/1999/xhtml";
  style: Record<string, string> = {};
  attributes = new Map<string, string>();
  className = "";
  disabled = false;
  tagName: string;
  nodeName: string;

  constructor(tagName: string, ownerDocument: MiniDocument | null) {
    super();
    this.tagName = tagName.toUpperCase();
    this.nodeName = this.tagName;
    this.ownerDocument = ownerDocument;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, String(value));
    if (name === "class") this.className = String(value);
    if (name === "disabled") this.disabled = true;
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
    if (name === "class") this.className = "";
    if (name === "disabled") this.disabled = false;
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener() {}
  removeEventListener() {}

  querySelector(selector: string) {
    return querySelectorFrom(this, selector, true);
  }

  querySelectorAll(selector: string) {
    return querySelectorFrom(this, selector, false);
  }
}

class MiniDocument extends MiniNode {
  nodeType = 9;
  nodeName = "#document";
  documentElement: MiniElement;
  body: MiniElement;
  defaultView: MiniWindow | null = null;
  activeElement: MiniElement | null = null;

  constructor() {
    super();
    this.ownerDocument = this;
    this.documentElement = new MiniElement("html", this);
    this.body = new MiniElement("body", this);
    this.documentElement.ownerDocument = this;
    this.body.ownerDocument = this;
    this.appendChild(this.documentElement);
    this.documentElement.appendChild(this.body);
    this.activeElement = this.body;
  }

  createElement(tagName: string) {
    return new MiniElement(tagName, this);
  }

  createElementNS(_ns: string, tagName: string) {
    return this.createElement(tagName);
  }

  createTextNode(text: string) {
    return new MiniText(text, this);
  }

  createComment(text: string) {
    return new MiniComment(text, this);
  }

  querySelector(selector: string) {
    return querySelectorFrom(this.body, selector, true);
  }

  querySelectorAll(selector: string) {
    return querySelectorFrom(this.body, selector, false);
  }

  addEventListener() {}
  removeEventListener() {}
}

type MiniWindow = {
  document: MiniDocument;
  navigator: { userAgent: string };
  location: { href: string };
  history: { replaceState: (...args: any[]) => void };
  print: ReturnType<typeof vi.fn>;
  addEventListener: () => void;
  removeEventListener: () => void;
  getComputedStyle: () => Record<string, string>;
  requestAnimationFrame: (cb: FrameRequestCallback) => number;
  cancelAnimationFrame: (id: number) => void;
  Node: typeof MiniNode;
  Element: typeof MiniElement;
  HTMLElement: typeof MiniElement;
  Text: typeof MiniText;
  Comment: typeof MiniComment;
  Document: typeof MiniDocument;
  HTMLIFrameElement: typeof MiniElement;
  MutationObserver: typeof MiniMutationObserver;
};

class MiniMutationObserver {
  disconnect() {}
  observe() {}
  takeRecords() {
    return [] as MutationRecord[];
  }
}

function matchesSelector(node: MiniNode, selector: string) {
  if (!(node instanceof MiniElement)) return false;
  if (selector.startsWith(".")) {
    const className = selector.slice(1);
    return node.className.split(/\s+/).filter(Boolean).includes(className);
  }
  if (selector.startsWith("[") && selector.endsWith("]")) {
    const [attr, value] = selector.slice(1, -1).split("=");
    const attrValue = node.getAttribute(attr);
    if (!value) return attrValue !== null;
    return attrValue === value.replace(/^"|"$/g, "");
  }
  return node.tagName.toLowerCase() === selector.toLowerCase();
}

function querySelectorFrom(root: MiniNode, selector: string, firstOnly: boolean) {
  const matches: MiniElement[] = [];
  const visit = (node: MiniNode) => {
    for (const child of node.childNodes) {
      if (matchesSelector(child, selector)) {
        matches.push(child as MiniElement);
        if (firstOnly) return true;
      }
      if (visit(child) && firstOnly) return true;
    }
    return false;
  };
  visit(root);
  return firstOnly ? matches[0] ?? null : matches;
}

function createMiniDom() {
  const document = new MiniDocument();
  const window: MiniWindow = {
    document,
    navigator: { userAgent: "vitest" },
    location: { href: "http://localhost/admin/quotations/42/print?autoprint=1" },
    history: { replaceState: vi.fn() },
    print: vi.fn(),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    getComputedStyle: () => ({}),
    requestAnimationFrame: (cb) => setTimeout(() => cb(performance.now()), 0) as unknown as number,
    cancelAnimationFrame: (id) => clearTimeout(id),
    Node: MiniNode,
    Element: MiniElement,
    HTMLElement: MiniElement,
    Text: MiniText,
    Comment: MiniComment,
    Document: MiniDocument,
    HTMLIFrameElement: MiniElement,
    MutationObserver: MiniMutationObserver,
  };
  document.defaultView = window;
  return { document, window };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("autoprint under StrictMode prints once and clears preparing state", async () => {
  const { document, window } = createMiniDom();
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", window);
  vi.stubGlobal("navigator", window.navigator);
  vi.stubGlobal("Node", MiniNode);
  vi.stubGlobal("Element", MiniElement);
  vi.stubGlobal("HTMLElement", MiniElement);
  vi.stubGlobal("Text", MiniText);
  vi.stubGlobal("Comment", MiniComment);
  vi.stubGlobal("Document", MiniDocument);
  vi.stubGlobal("HTMLIFrameElement", MiniElement);
  vi.stubGlobal("MutationObserver", window.MutationObserver);
  vi.stubGlobal("getComputedStyle", window.getComputedStyle);
  vi.stubGlobal("requestAnimationFrame", window.requestAnimationFrame);
  vi.stubGlobal("cancelAnimationFrame", window.cancelAnimationFrame);
  vi.stubGlobal("performance", performance);
  vi.stubGlobal("self", window);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

  let resolveReadiness!: () => void;
  waitForPrintReadinessMock.mockImplementation(() => new Promise<void>((resolve) => {
    resolveReadiness = resolve;
  }).then(() => ({ timedOut: false })));

  const { default: QuotationPrint } = await import("./admin.quotations.$id_.print");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container as any);

  await act(async () => {
    root.render(
      <StrictMode>
        <QuotationPrint />
      </StrictMode>,
    );
  });

  const button = container.querySelector("button") as any;
  expect(button?.textContent).toBe("Preparando...");
  expect(window.print).not.toHaveBeenCalled();

  resolveReadiness();
  await act(async () => {
    await Promise.resolve();
  });

  expect(window.print).toHaveBeenCalledTimes(1);
  expect(button?.textContent).toBe("Imprimir / PDF");
  expect(button?.disabled).toBe(false);
  expect(container.querySelector('[role="status"]')).toBe(null);
});
