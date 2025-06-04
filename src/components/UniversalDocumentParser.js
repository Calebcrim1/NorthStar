class UniversalDocumentParser {
  constructor() {
    this.contextClues = {
      client: {
        indicators: ['client', 'customer', 'account', 'company', 'organization', 'briefing for', 'notes for'],
        contextWords: ['name', 'called', 'known as', 'referred to as'],
        patterns: [
          // Look for "X Client Notes", "Notes for X", "X Briefing"
          /([A-Z][A-Za-z0-9\s&.,'()-]+?)\s*(?:Client Notes|Briefing|Base Information)/i,
          // Look for "Client: X" in any format
          /(?:Client|Customer|Account|Company)[:\s]+([A-Za-z0-9\s&.,'()-]+?)(?:\n|$)/i,
          // Look for repeated capitalized names (likely the client)
          /^([A-Z][A-Za-z0-9\s&.,'()-]+?)(?:\s+\1)/im
        ]
      },
      industry: {
        indicators: ['industry', 'sector', 'vertical', 'market', 'business', 'field', 'space'],
        contextWords: ['operates in', 'works in', 'focused on', 'specializes in', 'developer of', 'provider of'],
        businessTypes: ['technology', 'automotive', 'healthcare', 'finance', 'retail', 'manufacturing', 'media', 'gaming']
      },
      competitors: {
        indicators: ['competitors', 'competition', 'competitive', 'rivals', 'competing with', 'competes against'],
        contextWords: ['include', 'such as', 'including', 'namely', 'are', 'major', 'key', 'primary'],
        listIndicators: ['and', ',', ';', 'as well as', 'along with']
      },
      audience: {
        indicators: ['audience', 'readers', 'recipients', 'stakeholders', 'distribution', 'sent to', 'for'],
        contextWords: ['primary', 'main', 'key', 'including', 'staff', 'team', 'executives']
      },
      schedule: {
        indicators: ['schedule', 'timing', 'delivery', 'sent', 'distributed', 'published'],
        timePatterns: [
          /\b\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)\b/,
          /\b(?:daily|weekly|monthly|M-F|Mon-Fri|Monday[\s-]Friday)\b/i,
          /\b(?:morning|afternoon|evening|overnight)\b/i
        ]
      }
    };
  }

  // Smart extraction that looks for context, not just patterns
  extractWithContext(content, fieldType) {
    const { indicators, contextWords, patterns } = this.contextClues[fieldType];
    const results = [];
    
    // Split content into sentences and paragraphs
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    const paragraphs = content.split(/\n\s*\n/);
    
    // Look for indicators in sentences
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      
      // Check if sentence contains field indicators
      const hasIndicator = indicators.some(ind => lowerSentence.includes(ind));
      if (!hasIndicator) return;
      
      // Extract based on context
      if (fieldType === 'client') {
        // Look for capitalized names near indicators
        const namePattern = /\b([A-Z][A-Za-z0-9\s&.,'()-]+)\b/g;
        const matches = sentence.match(namePattern);
        if (matches) {
          results.push(...matches.filter(m => m.length > 2 && m.length < 50));
        }
      } else if (fieldType === 'competitors') {
        // Extract list of companies
        const afterIndicator = sentence.split(/competitors?|competition/i)[1];
        if (afterIndicator) {
          const companies = this.extractCompanyNames(afterIndicator);
          results.push(...companies);
        }
      }
    });
    
    // Also check patterns if provided
    if (patterns) {
      patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches && matches[1]) {
          results.push(matches[1].trim());
        }
      });
    }
    
    // Rank results by frequency and context
    return this.rankResults(results, content);
  }
  
  // Extract company names intelligently
  extractCompanyNames(text) {
    const companies = [];
    
    // Known company patterns
    const companyIndicators = ['Inc', 'LLC', 'Corp', 'Corporation', 'Ltd', 'Company', 'Co.'];
    const techCompanies = ['Google', 'Microsoft', 'Apple', 'Amazon', 'Meta', 'Tesla', 'Nvidia'];
    
    // Look for capitalized words that might be companies
    const words = text.match(/\b[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)*\b/g) || [];
    
    words.forEach(word => {
      // Check if it's likely a company
      const isCompany = 
        companyIndicators.some(ind => word.includes(ind)) ||
        techCompanies.some(tech => word.includes(tech)) ||
        (word.length > 3 && /^[A-Z]/.test(word));
      
      if (isCompany) {
        companies.push(word);
      }
    });
    
    return companies;
  }
  
  // Rank extracted results by relevance
  rankResults(results, fullContent) {
    const scored = results.map(result => {
      let score = 0;
      
      // Frequency score
      const frequency = (fullContent.match(new RegExp(result, 'gi')) || []).length;
      score += frequency * 10;
      
      // Position score (earlier in document = higher score)
      const firstIndex = fullContent.toLowerCase().indexOf(result.toLowerCase());
      score += (fullContent.length - firstIndex) / fullContent.length * 20;
      
      // Length score (reasonable length = higher score)
      if (result.length > 5 && result.length < 30) score += 10;
      
      // Capitalization score
      if (/^[A-Z]/.test(result)) score += 5;
      
      return { value: result, score };
    });
    
    // Sort by score and deduplicate
    const unique = [...new Set(scored.sort((a, b) => b.score - a.score).map(s => s.value))];
    return unique.slice(0, 10); // Return top 10 results
  }
}

export default UniversalDocumentParser;