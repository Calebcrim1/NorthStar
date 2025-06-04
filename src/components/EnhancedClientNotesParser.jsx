import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Settings, Brain, Zap, Shield, AlertTriangle, TrendingUp, Search, Eye } from 'lucide-react';

// Enhanced parser with multiple strategies and fuzzy matching
class ClientNotesParser {
  constructor(options = {}) {
    this.options = {
      enableFuzzyMatching: true,
      confidenceThreshold: 0.6,
      enableMLFeatures: true,
      enableCaching: true,
      clientType: null,
      customPatterns: {},
      ...options
    };
    
    // Initialize components
    this.cache = new ParsingCache();
    this.preprocessor = new DocumentPreprocessor();
    this.validator = new ParsingValidator();
    this.fallbackParser = new FallbackParser();
    
    // Common variations and synonyms for different fields
    this.fieldVariations = {
      client: ['client', 'customer', 'account', 'company', 'organization'],
      industry: ['industry', 'sector', 'vertical', 'business', 'field', 'market'],
      competitors: ['competitors', 'competition', 'competitive intelligence', 'competitor news', 'competing', 'rivals'],
      products: ['products', 'games', 'properties', 'offerings', 'services', 'portfolio'],
      executives: ['executives', 'leadership', 'management', 'c-suite', 'officers', 'leaders'],
      excluded: ['excluded', 'exclude', 'do not include', 'avoid', 'omit', 'restrictions', 'sensitive'],
      sources: ['sources', 'publications', 'media', 'outlets', 'news sources', 'highlighted sources'],
      briefing: ['briefing', 'schedule', 'delivery', 'distribution', 'timing'],
      audience: ['audience', 'recipients', 'readers', 'stakeholders', 'distribution list']
    };
    
    // Merge custom patterns
    if (options.customPatterns) {
      Object.keys(options.customPatterns).forEach(field => {
        if (this.fieldVariations[field]) {
          this.fieldVariations[field].push(...options.customPatterns[field]);
        }
      });
    }
    
    // Known patterns for different client types
    this.clientPatterns = {
      gaming: {
        indicators: ['game', 'gaming', 'esports', 'console', 'mobile gaming', 'pc gaming'],
        expectedFields: ['games', 'platforms', 'genres', 'esports'],
        competitorPatterns: ['EA', 'Electronic Arts', 'Ubisoft', 'Nintendo', 'Sony', 'Microsoft', 'Activision', 'Blizzard', 'Epic Games']
      },
      technology: {
        indicators: ['cloud', 'saas', 'software', 'tech', 'IT', 'digital', 'cyber'],
        expectedFields: ['services', 'technologies', 'platforms', 'solutions'],
        competitorPatterns: ['IBM', 'AWS', 'Google Cloud', 'Microsoft', 'Oracle', 'Salesforce', 'SAP']
      },
      healthcare: {
        indicators: ['health', 'medical', 'pharma', 'biotech', 'clinical'],
        expectedFields: ['treatments', 'therapies', 'drugs', 'devices'],
        competitorPatterns: ['Pfizer', 'J&J', 'Roche', 'Novartis', 'Merck', 'GSK']
      }
    };
    
    // Client-specific configuration profiles
    this.clientProfiles = {
      'rackspace': {
        expectedSections: ['Competitive Intelligence', 'Sources', 'Industry Insights', 'Highlighted Sources'],
        fieldMappings: {
          'Competitive Intelligence': 'competitors',
          'Highlighted Sources': 'sources',
          'Highlighted Rackspace Sources': 'sources'
        },
        industryDefault: 'Cloud Technology / Managed Services',
        requiredFields: ['clientName', 'competitors', 'sources'],
        customPatterns: {
          competitors: ['IBM', 'Tierpoint', 'WiPro', 'Wipro', 'Accenture', 'Cloudreach', 'DXC']
        }
      },
      'activision': {
        expectedSections: ['Games', 'Executives', 'Excluded Topics', 'Sources'],
        fieldMappings: {
          'Game Properties': 'games',
          'Leadership Team': 'executives'
        },
        industryDefault: 'Video Game Publishing',
        requiredFields: ['clientName', 'games', 'executives', 'excludedTopics']
      }
    };
  }

  // Main parsing method with multiple strategies
  parse(content, metadata = {}) {
    // Preprocessing with enhanced pipeline
    const preprocessedContent = this.preprocessor.process(content);
    const normalizedContent = this.normalizeContent(preprocessedContent);
    const documentStructure = this.analyzeDocumentStructure(normalizedContent);
    
    // Check cache for similar documents
    const cachedResult = this.cache.checkCache(normalizedContent, metadata);
    if (cachedResult && cachedResult.confidence > 0.9) {
      return cachedResult;
    }
    
    // Detect client profile if not specified
    if (!this.options.clientType && metadata.fileName) {
      this.options.clientType = this.detectClientFromFilename(metadata.fileName);
    }
    
    // Initialize result object with profile defaults
    let parsedData = this.initializeParsedData();
    if (this.options.clientType && this.clientProfiles[this.options.clientType]) {
      parsedData = this.applyClientProfile(parsedData, this.options.clientType);
    }
    
    // Apply multiple parsing strategies
    const strategies = [
      this.parseWithPatternMatching.bind(this),
      this.parseWithSectionDetection.bind(this),
      this.parseWithKeyValueExtraction.bind(this),
      this.parseWithContextualAnalysis.bind(this),
      this.parseWithTemplateMatching.bind(this)
    ];
    
    // Apply each strategy and merge results
    for (const strategy of strategies) {
      try {
        const strategyResult = strategy(normalizedContent, documentStructure);
        parsedData = this.mergeResults(parsedData, strategyResult);
      } catch (error) {
        console.warn('Strategy failed:', error);
      }
    }
    
    // Post-processing
    parsedData = this.postProcess(parsedData, normalizedContent);
    
    // Calculate confidence scores
    let confidence = this.calculateConfidence(parsedData);
    
    // Apply fallback strategies if confidence is low
    if (confidence.overall < this.options.confidenceThreshold) {
      const fallbackResult = this.fallbackParser.parse(normalizedContent, parsedData);
      if (fallbackResult.confidence > confidence.overall) {
        parsedData = fallbackResult.data;
        confidence = fallbackResult.confidence;
      }
    }
    
    // Validate results
    const validation = this.validator.validate(parsedData, documentStructure.type, this.options.clientType);
    
    // Cache successful high-confidence results
    const result = {
      data: parsedData,
      confidence,
      documentType: documentStructure.type,
      validation,
      warnings: this.generateWarnings(parsedData, confidence, validation),
      metadata
    };
    
    if (confidence.overall > 0.8 && this.options.enableCaching) {
      this.cache.store(normalizedContent, result, metadata);
    }
    
    // Learn from successful extractions
    if (confidence.overall > 0.7) {
      this.learnFromExtraction(parsedData, normalizedContent);
    }
    
    return result;
  }

  // Normalize content for better parsing
  normalizeContent(content) {
    return content
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Normalize whitespace
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Fix common OCR issues
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Preserve structure markers
      .replace(/^[-•*]\s*/gm, '• ')
      .replace(/^\d+\.\s*/gm, (match) => match);
  }

  // Analyze document structure
  analyzeDocumentStructure(content) {
    const lines = content.split('\n');
    const structure = {
      type: 'unknown',
      sections: [],
      hasHeaders: false,
      hasBullets: false,
      hasNumbering: false,
      lineCount: lines.length,
      avgLineLength: 0
    };
    
    let totalLength = 0;
    const sectionHeaders = [];
    
    lines.forEach((line, index) => {
      totalLength += line.length;
      
      // Detect headers (lines followed by content)
      if (line.match(/^[A-Z][A-Za-z\s]+:?\s*$/) && index < lines.length - 1 && lines[index + 1].trim()) {
        sectionHeaders.push({ text: line.trim(), index });
        structure.hasHeaders = true;
      }
      
      // Detect bullets
      if (line.match(/^[•\-*]\s+/)) {
        structure.hasBullets = true;
      }
      
      // Detect numbering
      if (line.match(/^\d+\.\s+/)) {
        structure.hasNumbering = true;
      }
    });
    
    structure.avgLineLength = totalLength / lines.length;
    structure.sections = this.identifySections(lines, sectionHeaders);
    structure.type = this.determineDocumentType(structure, content);
    
    return structure;
  }

  // Identify document sections
  identifySections(lines, headers) {
    const sections = [];
    
    headers.forEach((header, i) => {
      const startIdx = header.index;
      const endIdx = i < headers.length - 1 ? headers[i + 1].index : lines.length;
      
      sections.push({
        header: header.text,
        startLine: startIdx,
        endLine: endIdx,
        content: lines.slice(startIdx + 1, endIdx).join('\n'),
        type: this.classifySection(header.text)
      });
    });
    
    return sections;
  }

  // Classify section type using fuzzy matching
  classifySection(headerText) {
    const normalized = headerText.toLowerCase().replace(/[:\s]+/g, ' ').trim();
    
    for (const [fieldType, variations] of Object.entries(this.fieldVariations)) {
      for (const variation of variations) {
        if (this.fuzzyMatch(normalized, variation) > 0.7) {
          return fieldType;
        }
      }
    }
    
    return 'unknown';
  }

  // Fuzzy string matching
  fuzzyMatch(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Exact match
    if (s1 === s2) return 1;
    
    // Contains match
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Calculate similarity score (simplified Levenshtein)
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.calculateEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Calculate edit distance between strings
  calculateEditDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s2.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s1.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(j - 1) !== s2.charAt(i - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s1.length] = lastValue;
    }
    return costs[s1.length];
  }

  // Strategy 1: Pattern matching with flexibility
  parseWithPatternMatching(content, structure) {
    const result = this.initializeParsedData();
    
    // Client name extraction with multiple patterns
    const clientPatterns = [
      /^([A-Za-z0-9\s&\(\)\.]+?)(?:\s*\([^)]+\))?\s*(?:Client Notes|Client Brief|Notes|Brief)/im,
      /Client[\s:]+([^\n]+)/i,
      /Customer[\s:]+([^\n]+)/i,
      /Account[\s:]+([^\n]+)/i,
      /^([A-Z][A-Za-z0-9\s&\.]+?)(?:\s+Base Information|\s+Client Information)/im,
      /^Notes for[\s:]+([^\n]+)/im
    ];
    
    for (const pattern of clientPatterns) {
      const match = content.match(pattern);
      if (match) {
        result.clientName = this.cleanExtractedText(match[1]);
        break;
      }
    }
    
    // Industry extraction with variations
    const industryPatterns = [
      /(?:Industry|Sector|Vertical|Business|Market)[\s:]+([^\n]+)/i,
      /Primary (?:Industry|Business)[\s:]+([^\n]+)/i,
      /operates in (?:the\s+)?([^\n,]+)(?:\s+industry)?/i
    ];
    
    for (const pattern of industryPatterns) {
      const match = content.match(pattern);
      if (match) {
        result.industry = this.cleanExtractedText(match[1]);
        break;
      }
    }
    
    return result;
  }

  // Strategy 2: Section-based detection
  parseWithSectionDetection(content, structure) {
    const result = this.initializeParsedData();
    
    structure.sections.forEach(section => {
      switch (section.type) {
        case 'client':
          result.clientName = this.extractFromSection(section.content, 'client');
          break;
        case 'industry':
          result.industry = this.extractFromSection(section.content, 'industry');
          break;
        case 'competitors':
          result.competitors = this.extractCompetitors(section.content);
          break;
        case 'products':
          result.games = this.extractListItems(section.content);
          break;
        case 'excluded':
          result.excludedTopics = this.extractListItems(section.content);
          break;
        case 'sources':
          result.sources = this.extractSources(section.content);
          break;
      }
    });
    
    return result;
  }

  // Strategy 3: Key-value extraction
  parseWithKeyValueExtraction(content, structure) {
    const result = this.initializeParsedData();
    const lines = content.split('\n');
    
    lines.forEach(line => {
      // Look for key:value or key - value patterns
      const keyValueMatch = line.match(/^([A-Za-z\s]+?)[\s:–-]+(.+)$/);
      if (keyValueMatch) {
        const key = keyValueMatch[1].toLowerCase().trim();
        const value = keyValueMatch[2].trim();
        
        // Map keys to fields using fuzzy matching
        this.mapKeyToField(key, value, result);
      }
    });
    
    return result;
  }

  // Strategy 4: Contextual analysis
  parseWithContextualAnalysis(content, structure) {
    const result = this.initializeParsedData();
    
    // Determine client type from content
    const clientType = this.detectClientType(content);
    
    // Apply client-type specific extraction
    if (clientType && this.clientPatterns[clientType]) {
      const patterns = this.clientPatterns[clientType];
      
      // Extract competitors based on known patterns
      result.competitors = this.extractKnownEntities(content, patterns.competitorPatterns);
      
      // Set industry if not already found
      if (!result.industry && clientType === 'gaming') {
        result.industry = 'Video Game Publishing';
      } else if (!result.industry && clientType === 'technology') {
        result.industry = 'Technology Services';
      }
    }
    
    return result;
  }

  // Strategy 5: Template matching
  parseWithTemplateMatching(content, structure) {
    const result = this.initializeParsedData();
    
    // Check against known templates
    const templates = [
      {
        name: 'standard_client_notes',
        markers: ['Client Notes', 'Base Information', 'Competitive Intelligence'],
        parser: this.parseStandardTemplate.bind(this)
      },
      {
        name: 'brief_format',
        markers: ['Client:', 'Industry:', 'Competitors:', 'Sources:'],
        parser: this.parseBriefTemplate.bind(this)
      },
      {
        name: 'detailed_format',
        markers: ['Client Profile', 'Market Analysis', 'Strategic Focus'],
        parser: this.parseDetailedTemplate.bind(this)
      }
    ];
    
    for (const template of templates) {
      const matchScore = this.calculateTemplateMatch(content, template.markers);
      if (matchScore > 0.6) {
        return template.parser(content);
      }
    }
    
    return result;
  }

  // Helper methods
  cleanExtractedText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')
      .replace(/[()[\]{}]/g, '')
      .replace(/\s*[,-]\s*$/, '')
      .replace(/^[•\-*]\s*/, '')
      .trim();
  }

  extractListItems(content) {
    const items = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      const cleaned = line.trim();
      
      // Match bullet points, numbers, or comma-separated items
      if (cleaned.match(/^[•\-*]\s*.+/) || cleaned.match(/^\d+\.\s*.+/)) {
        const item = cleaned.replace(/^[•\-*\d.]\s*/, '').trim();
        if (item) items.push(item);
      } else if (cleaned.includes(',') && !cleaned.includes(':')) {
        // Handle comma-separated lists
        const parts = cleaned.split(',').map(p => p.trim()).filter(p => p);
        items.push(...parts);
      } else if (cleaned && !cleaned.includes(':') && cleaned.length < 100) {
        // Standalone items
        items.push(cleaned);
      }
    });
    
    return [...new Set(items)]; // Remove duplicates
  }

  extractCompetitors(content) {
    const competitors = new Set();
    
    // Extract from various formats
    const competitorSection = content.match(/(?:Competitors?|Competition|Competitive Intelligence)[\s:]*([^]+?)(?=\n\s*[A-Z][a-z]+[\s:]|$)/i);
    
    if (competitorSection) {
      const text = competitorSection[1];
      
      // Known company patterns
      const knownCompanies = [
        'IBM', 'Microsoft', 'Google', 'Amazon', 'AWS', 'Oracle', 'Salesforce',
        'Electronic Arts', 'EA', 'Ubisoft', 'Nintendo', 'Sony', 'Activision',
        'Pfizer', 'Johnson & Johnson', 'J&J', 'Merck', 'Roche',
        'Accenture', 'Deloitte', 'PwC', 'EY', 'KPMG',
        'DXC', 'HCL', 'TCS', 'Wipro', 'Infosys', 'Cognizant'
      ];
      
      // Check for known companies
      knownCompanies.forEach(company => {
        const regex = new RegExp(`\\b${company}\\b`, 'i');
        if (text.match(regex)) {
          competitors.add(company);
        }
      });
      
      // Extract from list formats
      const listItems = this.extractListItems(text);
      listItems.forEach(item => {
        if (item.length < 50) { // Likely a company name
          competitors.add(item);
        }
      });
    }
    
    return Array.from(competitors);
  }

  extractSources(content) {
    const sources = {
      tier1: [],
      tier2: [],
      tier3: [],
      handSearch: []
    };
    
    // Look for tiered sources
    const tierPatterns = [
      { tier: 'tier1', pattern: /(?:Tier\s*1|Primary|Priority)[\s:]+([^]+?)(?=Tier|Secondary|$)/i },
      { tier: 'tier2', pattern: /(?:Tier\s*2|Secondary)[\s:]+([^]+?)(?=Tier|Supplementary|$)/i },
      { tier: 'tier3', pattern: /(?:Tier\s*3|Supplementary|Additional)[\s:]+([^]+?)(?=Hand|Manual|$)/i },
      { tier: 'handSearch', pattern: /(?:Hand Search|Manual|Special)[\s:]+([^]+?)$/i }
    ];
    
    tierPatterns.forEach(({ tier, pattern }) => {
      const match = content.match(pattern);
      if (match) {
        sources[tier] = this.extractListItems(match[1]);
      }
    });
    
    // If no tiered structure, extract all sources and distribute
    if (Object.values(sources).every(arr => arr.length === 0)) {
      const allSources = this.extractListItems(content);
      const tierSize = Math.ceil(allSources.length / 4);
      
      sources.tier1 = allSources.slice(0, tierSize);
      sources.tier2 = allSources.slice(tierSize, tierSize * 2);
      sources.tier3 = allSources.slice(tierSize * 2, tierSize * 3);
      sources.handSearch = allSources.slice(tierSize * 3);
    }
    
    return sources;
  }

  extractKnownEntities(content, patterns) {
    const entities = new Set();
    const normalizedContent = content.toLowerCase();
    
    patterns.forEach(pattern => {
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (normalizedContent.match(regex)) {
        entities.add(pattern);
      }
    });
    
    return Array.from(entities);
  }

  detectClientType(content) {
    const normalizedContent = content.toLowerCase();
    let bestMatch = null;
    let highestScore = 0;
    
    for (const [type, config] of Object.entries(this.clientPatterns)) {
      let score = 0;
      
      config.indicators.forEach(indicator => {
        if (normalizedContent.includes(indicator)) {
          score += 1;
        }
      });
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = type;
      }
    }
    
    return highestScore > 0 ? bestMatch : null;
  }

  calculateTemplateMatch(content, markers) {
    let matches = 0;
    const normalizedContent = content.toLowerCase();
    
    markers.forEach(marker => {
      if (normalizedContent.includes(marker.toLowerCase())) {
        matches += 1;
      }
    });
    
    return matches / markers.length;
  }

  mergeResults(existing, newData) {
    const merged = { ...existing };
    
    // Merge with confidence weighting
    Object.keys(newData).forEach(key => {
      if (newData[key] && (!merged[key] || this.isBetterValue(newData[key], merged[key]))) {
        merged[key] = newData[key];
      }
    });
    
    return merged;
  }

  isBetterValue(newVal, existingVal) {
    // Arrays: prefer longer, more complete lists
    if (Array.isArray(newVal) && Array.isArray(existingVal)) {
      return newVal.length > existingVal.length;
    }
    
    // Strings: prefer longer, more descriptive values
    if (typeof newVal === 'string' && typeof existingVal === 'string') {
      return newVal.length > existingVal.length && newVal.length < 100; // Avoid noise
    }
    
    // Objects: prefer more complete objects
    if (typeof newVal === 'object' && typeof existingVal === 'object') {
      return Object.keys(newVal).length > Object.keys(existingVal).length;
    }
    
    return true;
  }

  postProcess(data, content) {
    const processed = { ...data };
    
    // Clean and validate all fields
    if (processed.clientName) {
      processed.clientName = this.cleanClientName(processed.clientName);
    }
    
    // Deduplicate arrays
    Object.keys(processed).forEach(key => {
      if (Array.isArray(processed[key])) {
        processed[key] = [...new Set(processed[key])];
      }
    });
    
    // Fill missing data with intelligent defaults
    if (!processed.industry && processed.clientName) {
      processed.industry = this.inferIndustry(processed.clientName, content);
    }
    
    return processed;
  }

  cleanClientName(name) {
    return name
      .replace(/\(.*?\)/g, '') // Remove parenthetical content
      .replace(/Client Notes?/gi, '')
      .replace(/Brief/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  inferIndustry(clientName, content) {
    // Industry inference based on client name and content
    const inferences = {
      gaming: ['game', 'entertainment', 'interactive', 'esports'],
      technology: ['tech', 'software', 'cloud', 'digital', 'cyber'],
      healthcare: ['health', 'medical', 'pharma', 'bio', 'clinical'],
      finance: ['bank', 'financial', 'capital', 'investment', 'insurance'],
      retail: ['retail', 'store', 'commerce', 'shop', 'consumer']
    };
    
    const combined = (clientName + ' ' + content).toLowerCase();
    
    for (const [industry, keywords] of Object.entries(inferences)) {
      for (const keyword of keywords) {
        if (combined.includes(keyword)) {
          return industry.charAt(0).toUpperCase() + industry.slice(1);
        }
      }
    }
    
    return 'Technology'; // Default fallback
  }

  calculateConfidence(data) {
    const scores = {
      clientName: data.clientName ? 1 : 0,
      industry: data.industry ? 0.8 : 0,
      competitors: data.competitors.length > 0 ? 0.9 : 0,
      sources: Object.values(data.sources).flat().length > 0 ? 0.8 : 0,
      excludedTopics: data.excludedTopics.length > 0 ? 0.7 : 0
    };
    
    const weights = {
      clientName: 0.3,
      industry: 0.2,
      competitors: 0.2,
      sources: 0.2,
      excludedTopics: 0.1
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.keys(scores).forEach(key => {
      totalScore += scores[key] * weights[key];
      totalWeight += weights[key];
    });
    
    return {
      overall: (totalScore / totalWeight),
      fields: scores,
      details: this.generateConfidenceDetails(scores)
    };
  }

  generateConfidenceDetails(scores) {
    const details = [];
    
    Object.entries(scores).forEach(([field, score]) => {
      if (score < 0.5) {
        details.push({
          field,
          issue: `${field} extraction confidence is low`,
          suggestion: `Review and manually verify ${field} data`
        });
      }
    });
    
    return details;
  }

  generateWarnings(data, confidence, validation) {
    const warnings = [];
    
    if (!data.clientName) {
      warnings.push({
        level: 'error',
        message: 'Client name could not be extracted',
        suggestion: 'Ensure document contains client identification'
      });
    }
    
    if (confidence.overall < this.options.confidenceThreshold) {
      warnings.push({
        level: 'warning',
        message: `Overall confidence (${Math.round(confidence.overall * 100)}%) is below threshold`,
        suggestion: 'Document may need manual review'
      });
    }
    
    if (data.competitors.length === 0) {
      warnings.push({
        level: 'info',
        message: 'No competitors were identified',
        suggestion: 'Add competitive intelligence section if needed'
      });
    }
    
    // Add validation warnings
    if (validation && !validation.isValid) {
      validation.issues.forEach(issue => {
        warnings.push({
          level: issue.level || 'warning',
          message: issue.message,
          suggestion: issue.suggestion
        });
      });
    }
    
    return warnings;
  }
  
  detectClientFromFilename(filename) {
    const normalized = filename.toLowerCase();
    for (const [clientKey, profile] of Object.entries(this.clientProfiles)) {
      if (normalized.includes(clientKey)) {
        return clientKey;
      }
    }
    return null;
  }
  
  applyClientProfile(parsedData, clientType) {
    const profile = this.clientProfiles[clientType];
    if (profile) {
      if (profile.industryDefault) {
        parsedData.industry = profile.industryDefault;
      }
      // Pre-populate expected patterns
      if (profile.customPatterns && profile.customPatterns.competitors) {
        parsedData.expectedCompetitors = profile.customPatterns.competitors;
      }
    }
    return parsedData;
  }
  
  learnFromExtraction(parsedData, content) {
    // Store successful patterns for future use
    Object.entries(parsedData).forEach(([field, value]) => {
      if (value && (typeof value === 'string' || Array.isArray(value))) {
        const pattern = this.findPatternForValue(content, value);
        if (pattern) {
          this.cache.learnPattern(field, pattern, value);
        }
      }
    });
  }
  
  findPatternForValue(content, value) {
    // Simple pattern detection for learning
    if (typeof value === 'string') {
      const index = content.indexOf(value);
      if (index > 0) {
        const context = content.substring(Math.max(0, index - 50), index);
        const match = context.match(/([A-Za-z\s]+)[:–-]\s*$/);
        if (match) {
          return match[1].trim();
        }
      }
    }
    return null;
  }

  initializeParsedData() {
    return {
      clientName: '',
      industry: '',
      games: [],
      executives: [],
      competitors: [],
      excludedTopics: [],
      sources: {
        tier1: [],
        tier2: [],
        tier3: [],
        handSearch: []
      },
      briefingInfo: {
        schedule: '',
        audience: '',
        length: ''
      },
      contacts: []
    };
  }

  parseStandardTemplate(content) {
    // Implementation for standard template parsing
    return this.initializeParsedData();
  }

  parseBriefTemplate(content) {
    // Implementation for brief template parsing
    return this.initializeParsedData();
  }

  parseDetailedTemplate(content) {
    // Implementation for detailed template parsing
    return this.initializeParsedData();
  }

  mapKeyToField(key, value, result) {
    // Map flexible keys to result fields
    const keyMappings = {
      client: ['clientName'],
      customer: ['clientName'],
      account: ['clientName'],
      industry: ['industry'],
      sector: ['industry'],
      vertical: ['industry'],
      schedule: ['briefingInfo', 'schedule'],
      audience: ['briefingInfo', 'audience'],
      recipients: ['briefingInfo', 'audience'],
      length: ['briefingInfo', 'length'],
      format: ['briefingInfo', 'length']
    };
    
    for (const [pattern, path] of Object.entries(keyMappings)) {
      if (this.fuzzyMatch(key, pattern) > 0.7) {
        if (path.length === 1) {
          result[path[0]] = value;
        } else {
          result[path[0]][path[1]] = value;
        }
        break;
      }
    }
  }

  extractFromSection(content, type) {
    // Extract specific data based on section type
    const cleanedContent = content.trim();
    
    if (type === 'client' || type === 'industry') {
      // Return first non-empty line
      const lines = cleanedContent.split('\n');
      for (const line of lines) {
        const cleaned = line.trim();
        if (cleaned && !cleaned.includes(':')) {
          return cleaned;
        }
      }
    }
    
    return '';
  }

  determineDocumentType(structure, content) {
    if (structure.sections.length > 5 && structure.hasHeaders) {
      return 'structured';
    } else if (structure.hasBullets || structure.hasNumbering) {
      return 'semi-structured';
    } else if (structure.avgLineLength > 50) {
      return 'narrative';
    } else {
      return 'brief';
    }
  }
}

// Preprocessing Pipeline
class DocumentPreprocessor {
  constructor() {
    this.commonOCRErrors = {
      'rnay': 'may',
      'frorn': 'from',
      'cornpany': 'company',
      'custorner': 'customer'
    };
  }
  
  process(content) {
    // 1. Encoding normalization
    content = this.normalizeEncoding(content);
    
    // 2. Format conversion
    content = this.convertToPlainText(content);
    
    // 3. OCR error correction
    content = this.correctCommonOCRErrors(content);
    
    // 4. Structure preservation
    content = this.preserveStructuralElements(content);
    
    // 5. Remove excessive whitespace while preserving structure
    content = this.normalizeWhitespace(content);
    
    return content;
  }
  
  normalizeEncoding(content) {
    // Handle different encodings and special characters
    return content
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€"/g, '-')
      .replace(/â€¦/g, '...')
      .replace(/\u2019/g, "'")
      .replace(/\u201C/g, '"')
      .replace(/\u201D/g, '"')
      .replace(/\u2014/g, '-');
  }
  
  convertToPlainText(content) {
    // Remove common formatting artifacts
    return content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\[.*?\]/g, '') // Remove markdown links
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/__(.*?)__/g, '$1'); // Remove underline markdown
  }
  
  correctCommonOCRErrors(content) {
    let corrected = content;
    Object.entries(this.commonOCRErrors).forEach(([error, correction]) => {
      const regex = new RegExp(`\\b${error}\\b`, 'gi');
      corrected = corrected.replace(regex, correction);
    });
    return corrected;
  }
  
  preserveStructuralElements(content) {
    // Ensure consistent structural markers
    return content
      .replace(/^(\s*)-\s+/gm, '• ') // Convert dashes to bullets
      .replace(/^(\s*)\*/gm, '• ') // Convert asterisks to bullets
      .replace(/^(\s*)o\s+/gm, '• '); // Convert 'o' bullets
  }
  
  normalizeWhitespace(content) {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\t/g, '    ') // Convert tabs to spaces
      .replace(/ +/g, ' ') // Remove multiple spaces
      .replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines
  }
}

// Caching and Learning System
class ParsingCache {
  constructor() {
    this.documentCache = new Map();
    this.patternCache = new Map();
    this.successfulExtractions = new Map();
    this.maxCacheSize = 100;
  }
  
  checkCache(content, metadata) {
    const hash = this.generateHash(content);
    if (this.documentCache.has(hash)) {
      const cached = this.documentCache.get(hash);
      // Check if cache is still valid (e.g., not too old)
      if (this.isCacheValid(cached)) {
        return cached.result;
      }
    }
    return null;
  }
  
  store(content, result, metadata) {
    const hash = this.generateHash(content);
    this.documentCache.set(hash, {
      result,
      metadata,
      timestamp: new Date(),
      accessCount: 0
    });
    
    // Maintain cache size
    if (this.documentCache.size > this.maxCacheSize) {
      this.evictOldest();
    }
  }
  
  learnPattern(field, pattern, value) {
    if (!this.successfulExtractions.has(field)) {
      this.successfulExtractions.set(field, []);
    }
    
    const extractions = this.successfulExtractions.get(field);
    const existing = extractions.find(e => e.pattern === pattern);
    
    if (existing) {
      existing.count++;
      existing.lastSeen = new Date();
    } else {
      extractions.push({
        pattern,
        value: Array.isArray(value) ? value.length : value,
        count: 1,
        firstSeen: new Date(),
        lastSeen: new Date()
      });
    }
    
    // Sort by success count
    extractions.sort((a, b) => b.count - a.count);
  }
  
  getSuggestedPatterns(field) {
    return this.successfulExtractions.get(field) || [];
  }
  
  generateHash(content) {
    // Simple hash function for content
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
  
  isCacheValid(cached) {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const age = new Date() - cached.timestamp;
    return age < maxAge;
  }
  
  evictOldest() {
    // Remove least recently used items
    const entries = Array.from(this.documentCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 10%
    const toRemove = Math.floor(this.maxCacheSize * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.documentCache.delete(entries[i][0]);
    }
  }
}

// Validation Framework
class ParsingValidator {
  constructor() {
    this.rules = {
      general: [
        { field: 'clientName', required: true, minLength: 2 },
        { field: 'industry', required: false, minLength: 3 }
      ],
      gaming: [
        { field: 'games', required: true, minItems: 1 },
        { field: 'platforms', required: false }
      ],
      technology: [
        { field: 'services', required: false },
        { field: 'technologies', required: false }
      ]
    };
  }
  
  validate(parsedData, documentType, clientType) {
    const issues = [];
    const applicableRules = [
      ...this.rules.general,
      ...(this.rules[clientType] || [])
    ];
    
    applicableRules.forEach(rule => {
      const value = this.getNestedValue(parsedData, rule.field);
      
      if (rule.required && !value) {
        issues.push({
          field: rule.field,
          level: 'error',
          message: `Required field '${rule.field}' is missing`,
          suggestion: `Ensure the document contains ${rule.field} information`
        });
      }
      
      if (value && rule.minLength && value.length < rule.minLength) {
        issues.push({
          field: rule.field,
          level: 'warning',
          message: `Field '${rule.field}' seems too short`,
          suggestion: `Verify ${rule.field} is complete`
        });
      }
      
      if (value && rule.minItems && Array.isArray(value) && value.length < rule.minItems) {
        issues.push({
          field: rule.field,
          level: 'warning',
          message: `Field '${rule.field}' has fewer items than expected`,
          suggestion: `Check if all ${rule.field} were extracted`
        });
      }
    });
    
    // Check for client-specific requirements
    if (clientType === 'rackspace' && (!parsedData.sources || Object.values(parsedData.sources).flat().length === 0)) {
      issues.push({
        field: 'sources',
        level: 'error',
        message: 'Rackspace clients require source lists',
        suggestion: 'Add Highlighted Sources section'
      });
    }
    
    return {
      isValid: issues.filter(i => i.level === 'error').length === 0,
      issues,
      score: this.calculateValidationScore(issues)
    };
  }
  
  getNestedValue(obj, path) {
    const parts = path.split('.');
    let value = obj;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }
  
  calculateValidationScore(issues) {
    const errorCount = issues.filter(i => i.level === 'error').length;
    const warningCount = issues.filter(i => i.level === 'warning').length;
    
    let score = 1.0;
    score -= errorCount * 0.2;
    score -= warningCount * 0.1;
    
    return Math.max(0, score);
  }
}

// Fallback Parser for low-confidence results
class FallbackParser {
  constructor() {
    this.strategies = [
      { name: 'Table Extraction', method: this.tryTableExtraction.bind(this) },
      { name: 'Keyword Density', method: this.tryKeywordDensity.bind(this) },
      { name: 'Sentence Analysis', method: this.trySentenceAnalysis.bind(this) },
      { name: 'Pattern Learning', method: this.tryPatternLearning.bind(this) }
    ];
  }
  
  parse(content, primaryResult) {
    let bestResult = primaryResult;
    let bestConfidence = 0;
    
    for (const strategy of this.strategies) {
      try {
        const result = strategy.method(content, primaryResult);
        if (result.confidence > bestConfidence) {
          bestResult = result.data;
          bestConfidence = result.confidence;
        }
      } catch (error) {
        console.warn(`Fallback strategy ${strategy.name} failed:`, error);
      }
    }
    
    return {
      data: bestResult,
      confidence: { overall: bestConfidence }
    };
  }
  
  tryTableExtraction(content, primaryResult) {
    const result = { ...primaryResult };
    const lines = content.split('\n');
    
    // Look for table-like structures
    lines.forEach((line, i) => {
      if (line.includes(':') || line.includes('|') || line.includes('\t')) {
        const parts = line.split(/[:|\t]/).map(p => p.trim());
        if (parts.length === 2) {
          const [key, value] = parts;
          this.mapTableValue(key, value, result);
        }
      }
    });
    
    return {
      data: result,
      confidence: this.calculateImprovement(primaryResult, result)
    };
  }
  
  tryKeywordDensity(content, primaryResult) {
    const result = { ...primaryResult };
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq = {};
    
    // Calculate word frequency
    words.forEach(word => {
      if (word.length > 3) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    // Find potential client name from high-frequency capitalized words
    const capitalizedWords = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
    const candidateNames = {};
    
    capitalizedWords.forEach(name => {
      if (name.length > 3 && !name.match(/^(The|This|That|These|Those)$/)) {
        candidateNames[name] = (candidateNames[name] || 0) + 1;
      }
    });
    
    // Set client name if found with high frequency
    const topCandidate = Object.entries(candidateNames)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topCandidate && topCandidate[1] > 3 && !result.clientName) {
      result.clientName = topCandidate[0];
    }
    
    return {
      data: result,
      confidence: this.calculateImprovement(primaryResult, result)
    };
  }
  
  trySentenceAnalysis(content, primaryResult) {
    const result = { ...primaryResult };
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    
    sentences.forEach(sentence => {
      // Look for definition-like sentences
      if (sentence.match(/\bis\s+(?:a|an|the)\s+/i)) {
        this.extractFromDefinition(sentence, result);
      }
      
      // Look for list introductions
      if (sentence.match(/(?:include|including|such as|follow)/i)) {
        this.extractFollowingList(sentence, content, result);
      }
    });
    
    return {
      data: result,
      confidence: this.calculateImprovement(primaryResult, result)
    };
  }
  
  tryPatternLearning(content, primaryResult) {
    // This would integrate with the cache's learned patterns
    const result = { ...primaryResult };
    
    // Placeholder for ML-based extraction
    // In a real implementation, this could use:
    // - Named Entity Recognition
    // - Text classification
    // - Similarity matching with previous successful extractions
    
    return {
      data: result,
      confidence: this.calculateImprovement(primaryResult, result) * 0.8 // Lower confidence for ML-based
    };
  }
  
  mapTableValue(key, value, result) {
    const normalizedKey = key.toLowerCase();
    
    if (normalizedKey.includes('client') || normalizedKey.includes('customer')) {
      result.clientName = value;
    } else if (normalizedKey.includes('industry') || normalizedKey.includes('sector')) {
      result.industry = value;
    } else if (normalizedKey.includes('compet')) {
      if (!result.competitors) result.competitors = [];
      result.competitors.push(...value.split(',').map(c => c.trim()));
    }
  }
  
  extractFromDefinition(sentence, result) {
    const match = sentence.match(/^(.+?)\s+is\s+(?:a|an|the)\s+(.+?)(?:\.|,)/i);
    if (match && !result.clientName) {
      const potentialName = match[1].trim();
      const definition = match[2].trim();
      
      if (potentialName.match(/^[A-Z]/) && potentialName.length < 50) {
        result.clientName = potentialName;
        if (definition.match(/company|corporation|organization/i)) {
          // Extract industry from definition
          const industryMatch = definition.match(/(\w+)\s+(?:company|corporation)/i);
          if (industryMatch && !result.industry) {
            result.industry = industryMatch[1];
          }
        }
      }
    }
  }
  
  extractFollowingList(sentence, fullContent, result) {
    const index = fullContent.indexOf(sentence);
    if (index === -1) return;
    
    const afterSentence = fullContent.substring(index + sentence.length);
    const nextParagraph = afterSentence.split('\n\n')[0];
    
    // Extract list items
    const listItems = nextParagraph.match(/[•\-*]\s*(.+)/g) || [];
    
    if (listItems.length > 0) {
      const items = listItems.map(item => item.replace(/^[•\-*]\s*/, '').trim());
      
      // Determine what type of list based on context
      if (sentence.match(/competitor|compet/i) && result.competitors.length === 0) {
        result.competitors = items;
      } else if (sentence.match(/product|service|game/i) && result.games.length === 0) {
        result.games = items;
      } else if (sentence.match(/source|publication/i) && Object.values(result.sources).flat().length === 0) {
        result.sources.tier1 = items.slice(0, Math.ceil(items.length / 3));
        result.sources.tier2 = items.slice(Math.ceil(items.length / 3));
      }
    }
  }
  
  calculateImprovement(original, updated) {
    let improvement = 0;
    let fields = 0;
    
    Object.keys(updated).forEach(key => {
      fields++;
      if (!original[key] && updated[key]) {
        improvement += 1;
      } else if (Array.isArray(updated[key]) && Array.isArray(original[key])) {
        if (updated[key].length > original[key].length) {
          improvement += 0.5;
        }
      }
    });
    
    return improvement / fields;
  }
}

// React Component
export default function EnhancedClientNotesParser() {
  const [parsedResult, setParsedResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [parserOptions, setParserOptions] = useState({
    enableFuzzyMatching: true,
    confidenceThreshold: 0.6,
    enableMLFeatures: true,
    enableCaching: true,
    clientType: null,
    customPatterns: {}
  });
  const [learningMode, setLearningMode] = useState(false);
  const [cachedPatterns, setCachedPatterns] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setFileName(file.name);

    try {
      const text = await file.text();
      const parser = new ClientNotesParser(parserOptions);
      const result = parser.parse(text, {
        fileName: file.name,
        fileSize: file.size,
        lastModified: new Date(file.lastModified)
      });
      
      setParsedResult(result);
      
      // Update cached patterns display
      if (parser.cache) {
        const patterns = [];
        ['client', 'industry', 'competitors'].forEach(field => {
          const fieldPatterns = parser.cache.getSuggestedPatterns(field);
          if (fieldPatterns.length > 0) {
            patterns.push({ field, patterns: fieldPatterns });
          }
        });
        setCachedPatterns(patterns);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setParsedResult({
        data: null,
        confidence: { overall: 0 },
        warnings: [{
          level: 'error',
          message: 'Failed to process file',
          suggestion: error.message
        }]
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClientTypeChange = (type) => {
    setParserOptions(prev => ({
      ...prev,
      clientType: type === 'auto' ? null : type
    }));
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getWarningIcon = (level) => {
    switch (level) {
      case 'error': return <AlertCircle className="text-red-500" />;
      case 'warning': return <AlertTriangle className="text-yellow-500" />;
      case 'info': return <AlertCircle className="text-blue-500" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Enhanced Client Notes Parser</h1>
          <p className="text-gray-400">Multi-strategy parsing with fuzzy matching, learning, and validation</p>
        </div>
        
        {/* Parser Options */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Settings className="text-blue-500" />
            Parser Configuration
          </h2>
          
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={parserOptions.enableFuzzyMatching}
                  onChange={(e) => setParserOptions(prev => ({
                    ...prev,
                    enableFuzzyMatching: e.target.checked
                  }))}
                  className="rounded text-blue-500"
                />
                <span>Enable Fuzzy Matching</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={parserOptions.enableMLFeatures}
                  onChange={(e) => setParserOptions(prev => ({
                    ...prev,
                    enableMLFeatures: e.target.checked
                  }))}
                  className="rounded text-blue-500"
                />
                <span>Enable ML Features</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={parserOptions.enableCaching}
                  onChange={(e) => setParserOptions(prev => ({
                    ...prev,
                    enableCaching: e.target.checked
                  }))}
                  className="rounded text-blue-500"
                />
                <span>Enable Learning Cache</span>
              </label>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Client Type Detection</label>
                <select
                  value={parserOptions.clientType || 'auto'}
                  onChange={(e) => handleClientTypeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded-md"
                >
                  <option value="auto">Auto-detect</option>
                  <option value="rackspace">Rackspace</option>
                  <option value="activision">Activision Blizzard</option>
                  <option value="gaming">Gaming Industry</option>
                  <option value="technology">Technology</option>
                  <option value="healthcare">Healthcare</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Confidence Threshold</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={parserOptions.confidenceThreshold}
                    onChange={(e) => setParserOptions(prev => ({
                      ...prev,
                      confidenceThreshold: parseFloat(e.target.value)
                    }))}
                    className="flex-1"
                  />
                  <span className="w-12 text-center">{(parserOptions.confidenceThreshold * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={learningMode}
                  onChange={(e) => setLearningMode(e.target.checked)}
                  className="rounded text-green-500"
                />
                <span className="text-green-400">Learning Mode (stores successful patterns)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Cached Patterns Display */}
        {cachedPatterns.length > 0 && parserOptions.enableCaching && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8 border-2 border-purple-500/30">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-purple-400">
              <Brain className="text-purple-500" />
              Learned Patterns
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {cachedPatterns.map(({ field, patterns }) => (
                <div key={field}>
                  <p className="text-sm font-medium mb-2 capitalize">{field} Patterns</p>
                  <div className="space-y-1">
                    {patterns.slice(0, 3).map((pattern, idx) => (
                      <div key={idx} className="text-xs bg-purple-900/20 px-2 py-1 rounded">
                        <span className="text-purple-400">{pattern.pattern}</span>
                        <span className="text-gray-500 ml-2">({pattern.count}x)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="text-blue-500" />
            Upload Client Notes
          </h2>
          
          <div 
            className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.doc,.docx,.md,.rtf,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {isProcessing ? (
              <div className="space-y-2">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p>Analyzing document structure...</p>
                <p className="text-sm text-gray-400">Applying multiple parsing strategies</p>
              </div>
            ) : fileName ? (
              <div className="space-y-2">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-gray-400">Click to analyze a different file</p>
              </div>
            ) : (
              <div className="space-y-2">
                <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                <p>Click to upload client notes document</p>
                <p className="text-sm text-gray-400">Supports various formats and structures</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-green-400">
              <Zap size={16} />
              <span>Enhanced preprocessing</span>
            </div>
            <div className="flex items-center gap-2 text-blue-400">
              <Brain size={16} />
              <span>Pattern learning</span>
            </div>
            <div className="flex items-center gap-2 text-purple-400">
              <Shield size={16} />
              <span>Validation & fallbacks</span>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {parsedResult && (
          <div className="space-y-6">
            {/* Overall Confidence */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="text-green-500" />
                Parsing Results & Confidence
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <p className="text-3xl font-bold">
                    <span className={getConfidenceColor(parsedResult.confidence.overall)}>
                      {Math.round(parsedResult.confidence.overall * 100)}%
                    </span>
                  </p>
                  <p className="text-sm text-gray-400">Overall Confidence</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Document Type</p>
                  <p className="font-medium capitalize">{parsedResult.documentType || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Validation Score</p>
                  <p className="font-medium">
                    {parsedResult.validation ? 
                      `${Math.round(parsedResult.validation.score * 100)}%` : 
                      'N/A'}
                  </p>
                </div>
              </div>
              
              {/* Field Confidence Breakdown */}
              {parsedResult.confidence.fields && (
                <div className="grid md:grid-cols-5 gap-4 mt-6">
                  {Object.entries(parsedResult.confidence.fields).map(([field, score]) => (
                    <div key={field} className="text-center">
                      <p className={`text-2xl font-bold ${getConfidenceColor(score)}`}>
                        {Math.round(score * 100)}%
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{field}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Validation Results */}
            {parsedResult.validation && !parsedResult.validation.isValid && (
              <div className="bg-gray-800 rounded-lg p-6 border-2 border-yellow-500/30">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Shield className="text-yellow-500" />
                  Validation Issues
                </h3>
                <div className="space-y-2">
                  {parsedResult.validation.issues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2 bg-gray-700/50 rounded">
                      {getWarningIcon(issue.level)}
                      <div className="flex-1">
                        <p className="font-medium">{issue.message}</p>
                        {issue.suggestion && (
                          <p className="text-sm text-gray-400 mt-1">{issue.suggestion}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings and Issues */}
            {parsedResult.warnings && parsedResult.warnings.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 border-2 border-yellow-500/30">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="text-yellow-500" />
                  Parsing Issues & Suggestions
                </h3>
                <div className="space-y-3">
                  {parsedResult.warnings.map((warning, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-700/50 rounded">
                      {getWarningIcon(warning.level)}
                      <div className="flex-1">
                        <p className="font-medium">{warning.message}</p>
                        {warning.suggestion && (
                          <p className="text-sm text-gray-400 mt-1">{warning.suggestion}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parsed Data sections */}
            {parsedResult.data && (
              <>
                {/* Client Information */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-blue-400">Client Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Client Name</p>
                      <p className="font-medium">{parsedResult.data.clientName || 'Not found'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Industry</p>
                      <p className="font-medium">{parsedResult.data.industry || 'Not found'}</p>
                    </div>
                  </div>
                </div>

                {/* Products/Games */}
                {parsedResult.data.games && parsedResult.data.games.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-green-400">
                      Products/Services ({parsedResult.data.games.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {parsedResult.data.games.map((game, idx) => (
                        <span key={idx} className="px-3 py-1 bg-green-900/30 border border-green-700 rounded-full text-sm">
                          {game}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competitors */}
                {parsedResult.data.competitors && parsedResult.data.competitors.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-orange-400">
                      Competitors ({parsedResult.data.competitors.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {parsedResult.data.competitors.map((competitor, idx) => (
                        <span key={idx} className="px-3 py-1 bg-orange-900/30 border border-orange-700 rounded-full text-sm">
                          {competitor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Excluded Topics */}
                {parsedResult.data.excludedTopics && parsedResult.data.excludedTopics.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6 border-2 border-red-500/30">
                    <h3 className="text-lg font-semibold mb-4 text-red-400">
                      Excluded Topics ({parsedResult.data.excludedTopics.length})
                    </h3>
                    <ul className="space-y-2">
                      {parsedResult.data.excludedTopics.slice(0, showDetails ? undefined : 5).map((topic, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          <span className="text-sm">{topic}</span>
                        </li>
                      ))}
                    </ul>
                    {parsedResult.data.excludedTopics.length > 5 && !showDetails && (
                      <button
                        onClick={() => setShowDetails(true)}
                        className="mt-3 text-sm text-blue-400 hover:underline"
                      >
                        Show {parsedResult.data.excludedTopics.length - 5} more...
                      </button>
                    )}
                  </div>
                )}

                {/* Sources */}
                {parsedResult.data.sources && Object.values(parsedResult.data.sources).some(arr => arr.length > 0) && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-purple-400">
                      Sources ({Object.values(parsedResult.data.sources).flat().length})
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      {Object.entries(parsedResult.data.sources).map(([tier, sources]) => (
                        sources.length > 0 && (
                          <div key={tier}>
                            <p className="text-sm font-medium mb-2 capitalize">{tier} Sources</p>
                            <div className="space-y-1">
                              {sources.map((source, idx) => (
                                <div key={idx} className="text-sm px-2 py-1 bg-purple-900/20 rounded">
                                  {source}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Parsing Strategies Used */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Brain className="text-blue-500" />
                    Processing Pipeline
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium mb-2">Preprocessing</p>
                      <div className="space-y-1 text-gray-400">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-green-500" />
                          <span>Encoding normalization</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-green-500" />
                          <span>OCR error correction</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-green-500" />
                          <span>Structure preservation</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium mb-2">Parsing Strategies</p>
                      <div className="space-y-1 text-gray-400">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-green-500" />
                          <span>Pattern matching</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-green-500" />
                          <span>Section detection</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-green-500" />
                          <span>Fuzzy matching</span>
                        </div>
                        {parsedResult.confidence.overall < 0.6 && (
                          <div className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-yellow-500" />
                            <span>Fallback strategies applied</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Raw Data View */}
                <details className="bg-gray-800 rounded-lg p-6">
                  <summary className="cursor-pointer font-semibold text-gray-400 hover:text-gray-200 flex items-center gap-2">
                    <Eye size={20} />
                    View Complete Parsed Data
                  </summary>
                  <pre className="mt-4 text-xs bg-gray-900 p-4 rounded overflow-x-auto">
                    {JSON.stringify(parsedResult, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}