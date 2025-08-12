// Test setup for SDK tests

// Mock File constructor for Node.js environment
if (typeof File === 'undefined') {
  (global as any).File = class File {
    name: string;
    type: string;
    size: number;
    
    constructor(chunks: any[], filename: string, options: any = {}) {
      this.name = filename;
      this.type = options.type || '';
      this.size = options.size || chunks.join('').length;
    }
  };
}

// Mock XMLHttpRequest for Node.js environment
if (typeof XMLHttpRequest === 'undefined') {
  (global as any).XMLHttpRequest = class XMLHttpRequest {
    upload = {
      addEventListener: jest.fn(),
    };
    
    addEventListener = jest.fn();
    open = jest.fn();
    send = jest.fn();
    setRequestHeader = jest.fn();
    status = 200;
  };
}