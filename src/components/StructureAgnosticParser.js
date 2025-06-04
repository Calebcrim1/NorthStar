class StructureAgnosticParser {
  constructor() {
    this.entityPatterns = {
      organizations: /\b(?:[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*\s+(?:Inc|Corp|LLC|Ltd|Limited|Co|Company))\b|\b(?:Microsoft|Google|Apple|Amazon|Meta|IBM|Rackspace|Activision|Blizzard|Electronic Arts|EA|Ubisoft|Nintendo|Sony)\b/g,
      people: /\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*|\b[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+,\s+(?:CEO|CTO|CFO|COO|VP|Director|President|Manager)\b/g,
      emails: /[\w.-]+@[\w.-]+\.\w+/g,
      urls: /https?:\/\/[^\s]+/g,
      times: /\b\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)\b|\b(?:morning|afternoon|evening|daily|weekly|monthly)\b/g
    };
  }

  analyzeDocumentStructure(content) {
    // Identify natural breaks in the document
    const sections = this.identifyNaturalSections(content);
    
    // Analyze each section for content type
    const analyzedSections = sections.map(section => ({
      content: section,
      type: this.classifySectionContent(section),
      entities: this.extractEntities(section),
      metadata: this.extractMetadata(section)
    }));
    
    return this.consolidateInformation(analyzedSections);
  }
  
  identifyNaturalSections(content) {
    const sections = [];
    
    // Split by multiple strategies
    // 1. Headers (any line that looks like a header)
    const headerPattern = /^(?:#{1,6}\s+|[A-Z][A-Za-z\s]+:|\d+\.\s+|[•\-*]\s+)?(.+)$/gm;
    
    // 2. Paragraph breaks
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // 3. Table sections
    const tables = content.match(/\+[-+]+\+[\s\S]*?\+[-+]+\+/g) || [];
    
    // 4. List sections
    const lists = content.match(/(?:^[\s]*[-•*]\s+.+$\n?)+/gm) || [];
    
    // Combine all sections intelligently
    return [...paragraphs, ...tables, ...lists].filter(s => s.trim().length > 20);
  }
  
  classifySectionContent(section) {
    const lower = section.toLowerCase();
    
    // Score each type
    const scores = {
      client: this.scoreContent(lower, ['client', 'customer', 'account', 'company name', 'organization']),
      industry: this.scoreContent(lower, ['industry', 'sector', 'vertical', 'market', 'business']),
      competitor: this.scoreContent(lower, ['competitor', 'competition', 'compete', 'rival', 'versus', 'vs']),
      source: this.scoreContent(lower, ['source', 'publication', 'media', 'news', 'outlet']),
      exclude: this.scoreContent(lower, ['exclude', 'not include', 'avoid', 'do not', 'negative']),
      schedule: this.scoreContent(lower, ['schedule', 'time', 'daily', 'weekly', 'am', 'pm']),
      description: this.scoreContent(lower, ['about', 'description', 'overview', 'is a', 'provides'])
    };
    
    // Return highest scoring type
    return Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }
  
  scoreContent(text, keywords) {
    return keywords.reduce((score, keyword) => {
      const count = (text.split(keyword).length - 1);
      // Weight by position (earlier = more important)
      const firstIndex = text.indexOf(keyword);
      const positionWeight = firstIndex >= 0 ? 1 + (1 / (1 + firstIndex * 0.01)) : 1;
      return score + (count * positionWeight * 10);
    }, 0);
  }
  
  extractEntities(text) {
    const entities = {
      organizations: [],
      people: [],
      times: [],
      emails: [],
      urls: []
    };
    
    // Extract different entity types using regex patterns
    for (const [type, pattern] of Object.entries(this.entityPatterns)) {
      const matches = text.match(pattern) || [];
      entities[type] = [...new Set(matches)]; // Use Set to remove duplicates
    }
    
    return entities;
  }
  
  extractMetadata(section) {
    // Extract key-value pairs
    const metadata = {};
    const keyValueRegex = /^([A-Za-z\s]+?)[\s:–-]+(.+)$/gm;
    let match;
    
    while ((match = keyValueRegex.exec(section)) !== null) {
      const key = match[1].trim().toLowerCase();
      const value = match[2].trim();
      metadata[key] = value;
    }
    
    return metadata;
  }
  
  consolidateInformation(analyzedSections) {
    const result = {
      clientName: '',
      industry: '',
      competitors: [],
      sources: {
        tier1: [],
        tier2: [],
        tier3: [],
        handSearch: []
      },
      excludedTopics: [],
      briefingInfo: {
        schedule: '',
        audience: '',
        frequency: ''
      },
      confidence: {}
    };
    
    // Process each section based on its type
    analyzedSections.forEach(section => {
      switch(section.type) {
        case 'client':
          // Extract client name from either metadata or the first organization entity
          if (Object.keys(section.metadata).length > 0) {
            const clientKey = Object.keys(section.metadata).find(key => 
              key.includes('client') || key.includes('customer') || key.includes('company')
            );
            if (clientKey) result.clientName = section.metadata[clientKey];
          } else if (section.entities.organizations.length > 0) {
            result.clientName = section.entities.organizations[0];
          }
          break;
          
        case 'industry':
          // Extract industry from metadata or content analysis
          const industryKey = Object.keys(section.metadata).find(key => 
            key.includes('industry') || key.includes('sector')
          );
          if (industryKey) result.industry = section.metadata[industryKey];
          break;
          
        case 'competitor':
          // Add competitors from organizations entities
          result.competitors.push(...section.entities.organizations);
          break;
          
        case 'source':
          // Distribute sources between tiers based on position/context
          const sources = section.entities.organizations;
          const tierSize = Math.ceil(sources.length / 3);
          result.sources.tier1.push(...sources.slice(0, tierSize));
          result.sources.tier2.push(...sources.slice(tierSize, tierSize*2));
          result.sources.tier3.push(...sources.slice(tierSize*2));
          break;
          
        case 'exclude':
          // Extract excluded topics from list-like content
          const listItems = section.content.match(/[•\-*]\s*([^\n]+)/g) || [];
          result.excludedTopics.push(
            ...listItems.map(item => item.replace(/^[•\-*]\s*/, '').trim())
          );
          break;
          
        case 'schedule':
          // Extract scheduling information
          result.briefingInfo.schedule = section.entities.times.join(', ');
          
          // Try to extract frequency
          const frequencyWords = ['daily', 'weekly', 'monthly', 'quarterly'];
          for (const word of frequencyWords) {
            if (section.content.toLowerCase().includes(word)) {
              result.briefingInfo.frequency = word;
              break;
            }
          }
          break;
      }
    });
    
    // Remove duplicates
    result.competitors = [...new Set(result.competitors)];
    result.excludedTopics = [...new Set(result.excludedTopics)];
    
    // Calculate confidence scores based on completeness
    const calculateConfidence = field => {
      if (Array.isArray(result[field])) {
        return result[field].length > 0 ? Math.min(1, result[field].length / 5) : 0;
      } else if (typeof result[field] === 'string') {
        return result[field] ? Math.min(1, result[field].length / 20) : 0;
      } else if (typeof result[field] === 'object') {
        return Object.values(result[field]).some(v => v.length > 0) ? 0.8 : 0;
      }
      return 0;
    };
    
    result.confidence = {
      clientName: calculateConfidence('clientName'),
      industry: calculateConfidence('industry'),
      competitors: calculateConfidence('competitors'),
      sources: calculateConfidence('sources'),
      excludedTopics: calculateConfidence('excludedTopics'),
      overall: 0 // Will be calculated as average
    };
    
    // Calculate overall confidence
    const confidenceValues = Object.entries(result.confidence)
      .filter(([key]) => key !== 'overall')
      .map(([_, value]) => value);
      
    result.confidence.overall = confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length;
    
    return result;
  }
}

export default StructureAgnosticParser;