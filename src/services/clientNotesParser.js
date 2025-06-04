import { ClientNotesParser } from '../components/EnhancedClientNotesParser';

class ClientNotesParserService {
  constructor() {
    this.parser = new ClientNotesParser({
      enableFuzzyMatching: true,
      confidenceThreshold: 0.6,
      enableCaching: true
    });
  }

  async parseFile(file) {
    const text = await file.text();
    return this.parser.parse(text, {
      fileName: file.name,
      fileSize: file.size,
      lastModified: new Date(file.lastModified)
    });
  }

  async parseText(text, metadata = {}) {
    return this.parser.parse(text, metadata);
  }
}

export default new ClientNotesParserService();