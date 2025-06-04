class IntelligentFieldAssembler {
  assembleFields(extractedData) {
    const result = {
      clientName: this.findBestValue(extractedData, 'client'),
      industry: this.inferIndustry(extractedData),
      competitors: this.consolidateCompetitors(extractedData),
      contacts: this.extractContacts(extractedData),
      schedule: this.findSchedule(extractedData),
      sources: this.organizeSources(extractedData),
      excludedTopics: this.findExclusions(extractedData)
    };
    
    return this.validateAndScore(result);
  }
  
  findBestValue(data, fieldType) {
    // Collect all possible values from different extraction methods
    const candidates = [];
    
    data.forEach(section => {
      if (section.type === fieldType || section.entities[fieldType]) {
        candidates.push(...(section.entities[fieldType] || []));
      }
    });
    
    // Use frequency and position to determine best value
    const frequency = {};
    candidates.forEach(val => {
      frequency[val] = (frequency[val] || 0) + 1;
    });
    
    // Return most frequent value
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  }
  
  inferIndustry(data) {
    // Look for industry keywords throughout the document
    const industryKeywords = {
      'technology': ['software', 'tech', 'digital', 'IT', 'cloud', 'AI', 'data'],
      'automotive': ['vehicle', 'car', 'driving', 'automotive', 'transportation'],
      'healthcare': ['health', 'medical', 'clinical', 'patient', 'pharma'],
      'finance': ['financial', 'banking', 'investment', 'capital', 'trading'],
      'gaming': ['game', 'gaming', 'entertainment', 'esports']
    };
    
    const allText = data.map(d => d.content).join(' ').toLowerCase();
    const scores = {};
    
    Object.entries(industryKeywords).forEach(([industry, keywords]) => {
      scores[industry] = keywords.reduce((score, keyword) => 
        score + (allText.split(keyword).length - 1), 0
      );
    });
    
    const topIndustry = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])[0];
    
    return topIndustry && topIndustry[1] > 2 ? topIndustry[0] : 'Technology';
  }
  
  consolidateCompetitors(data) {
    // Merge competitors from different sources
    const competitors = new Set();
    
    // Extract from organization entities
    data.forEach(section => {
      if (section.entities && section.entities.organizations) {
        section.entities.organizations.forEach(org => {
          if (this.isLikelyCompetitor(org, section.content)) {
            competitors.add(org);
          }
        });
      }
      
      // Look for competitor sections
      if (section.type === 'competitor') {
        const lines = section.content.split('\n');
        lines.forEach(line => {
          const clean = line.replace(/^[•\-*]\s*/, '').trim();
          if (clean.length > 0 && clean.length < 50) {
            competitors.add(clean);
          }
        });
      }
    });
    
    return Array.from(competitors);
  }
  
  isLikelyCompetitor(name, context) {
    // Check if organization name appears in a competitive context
    const competitiveTerms = [
      'competitor', 'competing', 'rival', 'alternative',
      'similar to', 'versus', 'vs', 'competition'
    ];
    
    const lowerContext = context.toLowerCase();
    return competitiveTerms.some(term => 
      lowerContext.includes(`${term} ${name.toLowerCase()}`) || 
      lowerContext.includes(`${name.toLowerCase()} ${term}`)
    );
  }
  
  extractContacts(data) {
    // Find contact information in the document
    const contacts = [];
    
    data.forEach(section => {
      if (section.entities && section.entities.people) {
        section.entities.people.forEach(person => {
          const contactInfo = {
            name: person,
            email: this.findAssociatedEmail(person, section.entities.emails || []),
            role: this.inferRole(person, section.content)
          };
          contacts.push(contactInfo);
        });
      }
    });
    
    return contacts;
  }
  
  findAssociatedEmail(person, emails) {
    // Try to match an email to a person
    const nameParts = person.toLowerCase().split(' ');
    
    for (const email of emails) {
      const emailPrefix = email.split('@')[0].toLowerCase();
      if (nameParts.some(part => emailPrefix.includes(part))) {
        return email;
      }
    }
    
    return '';
  }
  
  inferRole(person, context) {
    const roles = [
      'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'CIO',
      'Director', 'VP', 'Manager', 'Lead', 'Head'
    ];
    
    const contextWindow = 100;
    const personIndex = context.indexOf(person);
    
    if (personIndex >= 0) {
      const surroundingText = context.substring(
        Math.max(0, personIndex - contextWindow),
        Math.min(context.length, personIndex + person.length + contextWindow)
      );
      
      for (const role of roles) {
        if (surroundingText.includes(role)) {
          return role;
        }
      }
    }
    
    return '';
  }
  
  findSchedule(data) {
    // Extract scheduling information
    let schedule = {
      frequency: '',
      timezone: '',
      deliveryTime: ''
    };
    
    data.forEach(section => {
      // Look for schedule sections
      if (section.type === 'schedule') {
        const content = section.content.toLowerCase();
        
        // Find frequency
        const frequencies = ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly'];
        frequencies.forEach(freq => {
          if (content.includes(freq)) {
            schedule.frequency = freq;
          }
        });
        
        // Find timezone
        const timezones = ['ET', 'PT', 'EST', 'PST', 'GMT', 'UTC', 'CET'];
        timezones.forEach(tz => {
          if (content.includes(tz.toLowerCase()) || content.includes(tz)) {
            schedule.timezone = tz;
          }
        });
        
        // Find delivery time
        const timeMatch = content.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
        if (timeMatch) {
          schedule.deliveryTime = timeMatch[1];
        }
      }
    });
    
    return schedule;
  }
  
  organizeSources(data) {
    // Structure sources into tiers
    const sources = {
      tier1: [],
      tier2: [],
      tier3: [],
      handSearch: []
    };
    
    // Find source sections
    const sourceSection = data.find(section => section.type === 'source');
    if (sourceSection) {
      const content = sourceSection.content;
      
      // Look for tier indicators
      const tierPatterns = [
        { tier: 'tier1', pattern: /(?:Tier\s*1|Primary|Priority)[\s:]+([^]+?)(?=Tier|Secondary|$)/i },
        { tier: 'tier2', pattern: /(?:Tier\s*2|Secondary)[\s:]+([^]+?)(?=Tier|Supplementary|$)/i },
        { tier: 'tier3', pattern: /(?:Tier\s*3|Supplementary|Additional)[\s:]+([^]+?)(?=Hand|Manual|$)/i },
        { tier: 'handSearch', pattern: /(?:Hand Search|Manual|Special)[\s:]+([^]+?)$/i }
      ];
      
      tierPatterns.forEach(({ tier, pattern }) => {
        const match = content.match(pattern);
        if (match) {
          const items = match[1]
            .split('\n')
            .map(line => line.replace(/^[•\-*]\s*/, '').trim())
            .filter(Boolean);
          
          sources[tier].push(...items);
        }
      });
      
      // If no tiers found, distribute sources evenly
      if (Object.values(sources).every(arr => arr.length === 0)) {
        const items = content
          .split('\n')
          .map(line => line.replace(/^[•\-*]\s*/, '').trim())
          .filter(item => item.length > 0 && item.length < 50);
        
        const tierSize = Math.ceil(items.length / 4);
        sources.tier1 = items.slice(0, tierSize);
        sources.tier2 = items.slice(tierSize, tierSize * 2);
        sources.tier3 = items.slice(tierSize * 2, tierSize * 3);
        sources.handSearch = items.slice(tierSize * 3);
      }
    }
    
    return sources;
  }
  
  findExclusions(data) {
    // Extract excluded topics
    const exclusions = new Set();
    
    // Find exclusion sections
    const exclusionSection = data.find(section => section.type === 'exclude');
    if (exclusionSection) {
      const content = exclusionSection.content;
      const lines = content.split('\n');
      
      lines.forEach(line => {
        // Extract bullet points
        if (line.match(/^[•\-*]/)) {
          const clean = line.replace(/^[•\-*]\s*/, '').trim();
          if (clean.length > 0) {
            exclusions.add(clean);
          }
        }
        
        // Look for 'avoid' or 'exclude' phrases
        const avoidPattern = /(?:avoid|exclude|do not include|omit)[\s:]+(.+?)(?:\.|$)/i;
        const match = line.match(avoidPattern);
        if (match) {
          exclusions.add(match[1].trim());
        }
      });
    }
    
    return Array.from(exclusions);
  }
  
  validateAndScore(result) {
    // Add confidence scores and validation
    const scores = {};
    const warnings = [];
    
    // Score each field
    scores.clientName = result.clientName ? 0.9 : 0;
    scores.industry = result.industry ? 0.8 : 0;
    scores.competitors = Math.min(1, result.competitors.length * 0.2);
    scores.sources = Math.min(1, Object.values(result.sources).flat().length * 0.1);
    scores.excludedTopics = Math.min(1, result.excludedTopics.length * 0.2);
    
    // Generate weighted overall score
    const weights = {
      clientName: 3,
      industry: 2,
      competitors: 2,
      sources: 2,
      excludedTopics: 1
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.entries(scores).forEach(([field, score]) => {
      totalScore += score * (weights[field] || 1);
      totalWeight += weights[field] || 1;
      
      // Add warnings for low confidence fields
      if (score < 0.5 && weights[field] > 1) {
        warnings.push({
          field,
          level: 'warning',
          message: `Low confidence in ${field} extraction`,
          suggestion: `Please verify ${field} information manually`
        });
      }
    });
    
    // Return result with confidence data
    return {
      ...result,
      confidence: {
        overall: totalWeight > 0 ? totalScore / totalWeight : 0,
        fields: scores
      },
      warnings
    };
  }
}

export default IntelligentFieldAssembler;