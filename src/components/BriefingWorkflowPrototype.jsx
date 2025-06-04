import React, { useState, useEffect, useRef } from 'react';
import EnhancedClientNotesParser, { ClientNotesParser } from './EnhancedClientNotesParser';
import { ChevronRight, Search, FileText, Brain, CheckCircle, AlertCircle, Loader2, Settings, Moon, Sun, AlertTriangle, Shield, BarChart, Clock, Filter, TrendingUp, Users, Globe, CheckSquare, XCircle, Activity, Upload, FileUp, Eye, Download, Copy, Check } from 'lucide-react';
import mammoth from 'mammoth';

const BriefingWorkflowPrototype = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTestResults, setShowTestResults] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({
    clientNotes: null,
    searchTerms: null
  });
  const [parsedData, setParsedData] = useState({
    clientNotes: null,
    searchTerms: null
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const fileInputRef = useRef(null);
  const searchTermsInputRef = useRef(null);

  const [workflowData, setWorkflowData] = useState({
    clientName: '',
    clientNotes: '',
    industry: '',
    competitors: [],
    highPriorityKeywords: [],
    mediumPriorityKeywords: [],
    lowPriorityKeywords: [],
    contextualKeywords: [],
    emergingTopics: [],
    excludedTopics: [],
    searchStrings: [],
    historicalInsights: null,
    prioritySources: {
      tier1: [],
      tier2: [],
      tier3: [],
      handSearch: []
    },
    temporalParameters: {
      peakHours: [],
      updateFrequency: {},
      timezone: 'PT'
    },
    qualityMetrics: {
      minRelevanceScore: 85,
      maxDuplication: 15,
      balanceTargets: {}
    }
  });

  // Real client data from Activision Blizzard notes
  const activisionClient = {
    id: 'activision-blizzard',
    name: 'Activision Blizzard',
    industry: 'Video Game Publishing',
    status: 'Inactive Client',
    lastUpdated: '4/30/2021',
    contact: 'Kelvin Liu (Director, Corporate Communications)',
    briefingSpecs: {
      versions: 'Morning Briefing',
      length: '25 stories / 3 pages (whichever is shorter)',
      audience: 'Comms Team & Executives',
      schedule: 'Monday - Friday 7:00 a.m. PT'
    },
    games: [
      'Call of Duty',
      'Hearthstone', 
      'Overwatch',
      'Crash Team Racing Nitro-Fueled',
      'Diablo',
      'World of Warcraft'
    ],
    executives: [
      { name: 'Bobby Kotick', role: 'CEO', sentiment: 'positive-only' },
      { name: 'Daniel Alegre', role: 'President', sentiment: 'positive-only' },
      { name: 'Claudine Naughton', role: 'C-level', sentiment: 'positive-only' }
    ],
    competitors: [
      { name: 'Electronic Arts', type: 'direct', priority: 'high' },
      { name: 'Ubisoft', type: 'direct', priority: 'high' },
      { name: 'Capcom', type: 'regional', priority: 'medium' },
      { name: 'Rockstar', type: 'genre', priority: 'medium' },
      { name: 'Sony (PlayStation)', type: 'platform', priority: 'high' },
      { name: 'Microsoft (Xbox)', type: 'platform', priority: 'high' },
      { name: 'Nintendo', type: 'platform', priority: 'medium' }
    ],
    excludedTopics: [
      'Negative articles on Bobby Kotick, Daniel Alegre, Claudine Naughton or other C-level executives',
      'Discussion of executive compensation (except positive coverage)',
      'Motley Fool articles',
      'Seeking Alpha content',
      'Workplace controversies',
      'Legal disputes (unless company wins)',
      'Stock downgrades (unless disputed)'
    ],
    prioritySources: {
      tier1: ['IGN', 'GameSpot', 'Polygon', 'Kotaku', 'Reuters', 'Wall Street Journal', 'Bloomberg'],
      tier2: ['PC Gamer', 'GamesRadar', 'VentureBeat', 'The Verge', 'Variety', 'TechCrunch', 'Engadget'],
      tier3: ['Game Informer', 'Destructoid', 'Rock Paper Shotgun', 'Eurogamer', 'The Gamer'],
      handSearch: ['Attack of the Fanboy', 'CharlieIntel', 'Shacknews', 'MP1st']
    },
    regionalFocus: {
      primary: ['North America', 'Europe'],
      secondary: ['Asia-Pacific', 'Latin America'],
      emerging: ['Middle East', 'Africa']
    }
  };

  // Sample data for demonstration
  const sampleClients = [
    activisionClient,
    { 
      id: 'rackspace', 
      name: 'Rackspace Technology', 
      industry: 'Cloud Technology / Managed Services', 
      status: 'Active',
      briefingSpecs: {
        versions: 'Weekly Briefing',
        length: '10-12 stories',
        audience: 'Leadership & Comms',
        schedule: 'Fridays @ 8 AM ET'
      }
    },
    { id: 2, name: 'EA Sports', industry: 'Video Game Publishing', status: 'Active' },
    { id: 3, name: 'Netflix Games', industry: 'Entertainment/Gaming', status: 'Active' }
  ];

  const workflowSteps = [
    { id: 0, name: 'Data Upload', icon: Upload },
    { id: 1, name: 'Client Selection', icon: Settings },
    { id: 2, name: 'Input Collection', icon: FileText },
    { id: 3, name: 'Client Notes Integration', icon: Brain },
    { id: 4, name: 'Search String Generation', icon: Search },
    { id: 5, name: 'Quality Assurance', icon: CheckSquare },
    { id: 6, name: 'Final Assembly', icon: CheckCircle }
  ];

  const styles = {
    container: `min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`,
    header: `${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-6 sticky top-0 z-10 backdrop-blur-sm bg-opacity-95`,
    card: `${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6 shadow-lg`,
    input: `w-full p-3 rounded-md ${darkMode ? 'bg-gray-700 text-gray-100 border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'} border focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`,
    button: `px-6 py-3 rounded-md font-medium transition-all duration-200 transform hover:scale-105`,
    primaryButton: `bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg`,
    secondaryButton: `${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} text-current`,
    stepIndicator: `flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all duration-300`,
    activeStep: `bg-blue-600 text-white shadow-lg`,
    completedStep: `bg-green-600 text-white`,
    futureStep: `${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-300 text-gray-600'}`,
    codeBlock: `${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'} border rounded-md p-4 font-mono text-sm overflow-x-auto`,
    badge: `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium`,
    successBadge: `bg-green-500 bg-opacity-20 text-green-400 border border-green-500 border-opacity-30`,
    warningBadge: `bg-yellow-500 bg-opacity-20 text-yellow-400 border border-yellow-500 border-opacity-30`,
    errorBadge: `bg-red-500 bg-opacity-20 text-red-400 border border-red-500 border-opacity-30`,
    infoBadge: `bg-blue-500 bg-opacity-20 text-blue-400 border border-blue-500 border-opacity-30`,
    purpleBadge: `bg-purple-500 bg-opacity-20 text-purple-400 border border-purple-500 border-opacity-30`,
    grayBadge: `bg-gray-500 bg-opacity-20 text-gray-400 border border-gray-500 border-opacity-30`
  };

  // File upload handlers
  const handleFileUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    setProcessingStatus(`Processing ${type}...`);
    setIsProcessing(true);

    try {
      // First, check the file size
      if (file.size > 5000000) { // 5MB limit
        throw new Error("File too large (max 5MB)");
      }

      // Get file extension
      const fileExtension = file.name.split('.').pop().toLowerCase();
      let text = '';
      
      // Handle different file formats
      if (fileExtension === 'docx') {
        // For DOCX documents (newer format)
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (fileExtension === 'doc') {
        // For DOC documents (older format)
        // Just read as text and then clean it up
        text = await file.text();
        // Basic cleanup for doc files
        text = text.replace(/[^\x20-\x7E\r\n]/g, ' ') // Replace non-printable chars
                 .replace(/\s+/g, ' ')                // Normalize whitespace
                 .replace(/\r\n|\r|\n/g, '\n');      // Normalize line endings
      } else {
        // For text files (.txt, .md, etc.)
        text = await file.text();
      }
      
      console.log(`File content length: ${text.length} characters`);
      
      if (type === 'clientNotes') {
        try {
          // Use our parseClientNotes helper
          const parsedResult = await parseClientNotes(text);
          console.log('Parser result:', parsedResult);
          
          // Set the parsed data in state
          setParsedData(prev => ({ ...prev, clientNotes: parsedResult }));
          
          // Auto-populate workflow data with parsed results
          setWorkflowData(prev => ({
            ...prev,
            clientName: parsedResult.clientName || prev.clientName,
            industry: parsedResult.industry || prev.industry,
            competitors: parsedResult.competitors || prev.competitors,
            excludedTopics: parsedResult.excludedTopics || prev.excludedTopics,
            prioritySources: parsedResult.sources || prev.prioritySources
          }));
        } catch (parseError) {
          console.error('Parser specific error:', parseError);
          throw new Error(`Parsing failed: ${parseError.message}`);
        }
        
        // Set the uploaded file info regardless of parsing result
        setUploadedFiles(prev => ({
          ...prev,
          [type]: { name: file.name, content: text }
        }));
      } else if (type === 'searchTerms') {
        // Handle search terms file upload as before
        setUploadedFiles(prev => ({
          ...prev,
          [type]: { name: file.name, content: text }
        }));
        parseSearchTerms(text);
      }
      
      setProcessingStatus(`${type} processed successfully!`);
      setTimeout(() => setProcessingStatus(''), 3000);
    } catch (error) {
      console.error('Error processing file:', error);
      setProcessingStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Parse client notes to extract key information
  const parseClientNotes = async (content) => {
    try {
      const parser = new ClientNotesParser({
        clientType: 'auto',
        enableFuzzyMatching: true
      });

      const result = parser.parse(content);
      
      return {
        clientName: result.data?.clientName || 'Unknown Client',
        industry: result.data?.industry || '',
        games: result.data?.games || [],
        executives: result.data?.executives || [],
        competitors: result.data?.competitors || [],
        excludedTopics: result.data?.excludedTopics || [],
        sources: result.data?.sources || { tier1: [], tier2: [], tier3: [], handSearch: [] },
        confidence: result.confidence || { overall: 0 },
        warnings: result.warnings || []
      };
    } catch (error) {
      console.error("Parser error:", error);
      return {
        clientName: 'Parsing Error',
        industry: '',
        games: [],
        executives: [],
        competitors: [],
        excludedTopics: [],
        sources: { tier1: [], tier2: [], tier3: [], handSearch: [] },
        confidence: { overall: 0 },
        warnings: [{ message: `Failed to parse document: ${error.message}` }]
      };
    }
  };

  // Parse search terms from uploaded file
  const parseSearchTerms = (content) => {
    const lines = content.split('\n').filter(line => line.trim());
    const searchTerms = [];
    
    lines.forEach(line => {
      // Check if it's a boolean search string
      if (line.includes('AND') || line.includes('OR') || line.includes('NOT') || line.includes('"')) {
        searchTerms.push(line.trim());
      }
    });

    setParsedData(prev => ({ ...prev, searchTerms }));
    
    // Add search terms to workflow data
    if (searchTerms.length > 0) {
      setWorkflowData(prev => ({
        ...prev,
        searchStrings: [...prev.searchStrings, ...searchTerms]
      }));
    }
  };

  const handleNextStep = () => {
    if (currentStep < workflowSteps.length - 1) {
      setIsProcessing(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsProcessing(false);
        
        if (currentStep === 2) {
          simulateClientNotesProcessing();
        } else if (currentStep === 3) {
          simulateSearchStringGeneration();
        }
      }, 1500);
    }
  };

  const simulateClientNotesProcessing = () => {
    // Process based on uploaded data or selected client
    if (parsedData.clientNotes && parsedData.clientNotes.clientName) {
      // Use parsed data from uploaded file
      const { clientName, games, competitors, excludedTopics, sources } = parsedData.clientNotes;
      
      // Handle different client types
      if (clientName.toLowerCase().includes('rackspace')) {
        // Rackspace-specific keywords
        setWorkflowData(prev => ({
          ...prev,
          highPriorityKeywords: [
            'Rackspace Technology',
            'cloud services',
            'managed services',
            'multi-cloud',
            'hybrid cloud',
            'digital transformation'
          ],
          mediumPriorityKeywords: [
            'cloud adoption',
            'security',
            'AI',
            'machine learning',
            'data analytics',
            'AWS partnership'
          ],
          lowPriorityKeywords: [
            'technology trends',
            'cloud migration',
            'infrastructure'
          ],
          contextualKeywords: [
            'COVID-19 impact',
            'remote work solutions',
            'cloud security',
            'compliance'
          ],
          emergingTopics: [
            'edge computing',
            'serverless',
            'kubernetes',
            'DevOps'
          ],
          temporalParameters: {
            peakHours: ['8:00 AM ET'],
            updateFrequency: {
              tier1: 'weekly',
              tier2: 'weekly',
              tier3: 'weekly',
              handSearch: 'weekly'
            },
            timezone: 'ET'
          },
          historicalInsights: {
            relevanceScore: 90,
            topPerformingTopics: ['Rackspace partnerships', 'Cloud industry news', 'Competitive intelligence'],
            avoidTopics: excludedTopics.slice(0, 3),
            engagementMetrics: {
              avgOpenRate: 82,
              avgClickRate: 48,
              topClickedSections: ['Rackspace in the News', 'Industry Insights', 'Competitive Intelligence']
            }
          }
        }));
      } else if (games && games.length > 0) {
        // Gaming company keywords
        setWorkflowData(prev => ({
          ...prev,
          highPriorityKeywords: [
            ...games.slice(0, 3),
            prev.clientName,
            'earnings report',
            'new launch'
          ],
          mediumPriorityKeywords: [
            ...games.slice(3, 6),
            'mobile gaming',
            'esports'
          ],
          lowPriorityKeywords: [
            'game updates',
            'patch notes',
            'player statistics'
          ],
          contextualKeywords: [
            'acquisition',
            'regulatory',
            'market share'
          ],
          emergingTopics: [
            'AI in gaming',
            'cloud gaming',
            'subscription services'
          ],
          historicalInsights: {
            relevanceScore: 88,
            topPerformingTopics: games.slice(0, 3),
            avoidTopics: excludedTopics.slice(0, 3),
            engagementMetrics: {
              avgOpenRate: 75,
              avgClickRate: 42,
              topClickedSections: ['Corporate News', 'Game Updates']
            }
          }
        }));
      } else {
        // Generic client keywords
        setWorkflowData(prev => ({
          ...prev,
          highPriorityKeywords: [
            prev.clientName,
            'financial results',
            'partnership',
            'acquisition',
            'product launch'
          ],
          mediumPriorityKeywords: competitors.slice(0, 5),
          lowPriorityKeywords: [
            'industry trends',
            'market analysis',
            'technology updates'
          ],
          contextualKeywords: [
            'digital transformation',
            'innovation',
            'sustainability'
          ],
          emergingTopics: [
            'AI adoption',
            'automation',
            'cybersecurity'
          ],
          historicalInsights: {
            relevanceScore: 85,
            topPerformingTopics: ['Company news', 'Industry updates', 'Competitive analysis'],
            avoidTopics: excludedTopics.slice(0, 3),
            engagementMetrics: {
              avgOpenRate: 73,
              avgClickRate: 40,
              topClickedSections: ['Company News', 'Industry News']
            }
          }
        }));
      }
    } else if (workflowData.clientName === 'Activision Blizzard') {
      // Use predefined data
      simulateActivisionProcessing();
    } else if (workflowData.clientName.toLowerCase().includes('rackspace')) {
      // Handle manually selected Rackspace
      setWorkflowData(prev => ({
        ...prev,
        highPriorityKeywords: [
          'Rackspace Technology',
          'cloud services',
          'managed services',
          'multi-cloud',
          'hybrid cloud'
        ],
        mediumPriorityKeywords: [
          'IBM', 'AWS', 'Google Cloud', 'Microsoft Azure', 'digital transformation'
        ],
        competitors: [
          { name: 'IBM', type: 'direct', priority: 'high' },
          { name: 'Tierpoint', type: 'direct', priority: 'medium' },
          { name: 'WiPro', type: 'direct', priority: 'medium' },
          { name: 'Accenture', type: 'consulting', priority: 'high' },
          { name: 'Cloudreach', type: 'direct', priority: 'medium' },
          { name: 'DXC', type: 'direct', priority: 'medium' }
        ]
      }));
    }
  };

  const simulateActivisionProcessing = () => {
    setWorkflowData(prev => ({
      ...prev,
      highPriorityKeywords: [
        'Call of Duty', 
        'Overwatch', 
        'World of Warcraft',
        'Activision Blizzard acquisition',
        'Bobby Kotick (positive only)',
        'earnings report',
        'new game launch'
      ],
      mediumPriorityKeywords: [
        'Hearthstone',
        'Diablo',
        'esports',
        'Blizzard Entertainment',
        'King Digital',
        'mobile gaming'
      ],
      lowPriorityKeywords: [
        'game updates',
        'patch notes',
        'player statistics',
        'streaming viewership'
      ],
      contextualKeywords: [
        'Microsoft acquisition',
        'regulatory approval',
        'market consolidation',
        'cloud gaming'
      ],
      emergingTopics: [
        'AI in gaming',
        'Web3 gaming',
        'cross-platform play',
        'subscription services'
      ],
      excludedTopics: activisionClient.excludedTopics,
      competitors: activisionClient.competitors,
      prioritySources: activisionClient.prioritySources,
      temporalParameters: {
        peakHours: ['6:00 AM PT', '12:00 PM PT', '3:00 PM PT'],
        updateFrequency: {
          tier1: 'hourly',
          tier2: '2-3 hours',
          tier3: 'daily',
          handSearch: 'twice daily'
        },
        timezone: 'PT'
      },
      qualityMetrics: {
        minRelevanceScore: 85,
        maxDuplication: 15,
        balanceTargets: {
          corporate: 40,
          product: 35,
          competitive: 15,
          industry: 10
        }
      },
      historicalInsights: {
        relevanceScore: 92,
        topPerformingTopics: ['Call of Duty updates', 'Overwatch League', 'Company acquisitions'],
        avoidTopics: ['Executive compensation', 'Workplace controversies'],
        engagementMetrics: {
          avgOpenRate: 78,
          avgClickRate: 45,
          topClickedSections: ['Corporate News', 'Game Updates', 'Competitive Intelligence']
        }
      }
    }));
  };

  const simulateSearchStringGeneration = () => {
    // Generate search strings based on uploaded data or selected client
    const baseSearchStrings = parsedData.searchTerms || [];
    
    if (workflowData.clientName) {
      let generatedStrings = [...baseSearchStrings];
      
      if (workflowData.clientName.toLowerCase().includes('rackspace')) {
        // Rackspace-specific search strings
        generatedStrings = [
          ...baseSearchStrings,
          '"Rackspace Technology" AND ("partnership" OR "collaboration" OR "alliance")',
          '"Rackspace" AND ("cloud services" OR "managed services" OR "multi-cloud")',
          '"Rackspace" AND ("AWS" OR "Amazon Web Services" OR "Google Cloud" OR "Microsoft Azure")',
          '("IBM" OR "Tierpoint" OR "WiPro" OR "Accenture" OR "Cloudreach" OR "DXC") AND "cloud services"',
          '"cloud industry" AND ("trends" OR "forecast" OR "growth") AND "2025"',
          '"hybrid cloud" OR "multi-cloud" AND ("adoption" OR "strategy" OR "benefits")',
          '"digital transformation" AND "cloud" AND ("case study" OR "success story")',
          '"Rackspace" AND ("AI" OR "machine learning" OR "artificial intelligence")'
        ];
      } else if (workflowData.highPriorityKeywords.some(k => k.toLowerCase().includes('game'))) {
        // Gaming company search strings
        generatedStrings = [
          ...baseSearchStrings,
          `"${workflowData.clientName}" AND ("earnings" OR "revenue" OR "financial results") AND "2025"`,
          ...workflowData.highPriorityKeywords.slice(0, 3).map(keyword => 
            `"${keyword}" AND ("update" OR "launch" OR "announcement") NOT ("controversy" OR "lawsuit")`
          ),
          ...workflowData.competitors.slice(0, 3).map(comp => 
            `"${comp.name}" AND ("market share" OR "earnings" OR "strategy")`
          )
        ];
      } else {
        // Generic search strings
        generatedStrings = [
          ...baseSearchStrings,
          `"${workflowData.clientName}" AND ("announcement" OR "news" OR "update")`,
          `"${workflowData.clientName}" AND ("partnership" OR "collaboration" OR "acquisition")`,
          `"${workflowData.clientName}" AND ("financial" OR "earnings" OR "revenue")`,
          ...workflowData.competitors.slice(0, 2).map(comp => 
            `"${comp.name}" AND "${workflowData.industry}"`
          )
        ];
      }

      setWorkflowData(prev => ({
        ...prev,
        searchStrings: [...new Set(generatedStrings)] // Remove duplicates
      }));
    }
  };

  const exportConfiguration = () => {
    const config = {
      client: workflowData.clientName,
      exportDate: new Date().toISOString(),
      configuration: workflowData,
      uploadedFiles: {
        clientNotes: uploadedFiles.clientNotes?.name,
        searchTerms: uploadedFiles.searchTerms?.name
      }
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowData.clientName.replace(/\s+/g, '-')}-briefing-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const StepIndicator = ({ step, index }) => {
    const Icon = step.icon;
    const isActive = currentStep === index;
    const isCompleted = currentStep > index;
    
    return (
      <div className="flex flex-col items-center">
        <div className={`${styles.stepIndicator} ${
          isActive ? styles.activeStep : 
          isCompleted ? styles.completedStep : 
          styles.futureStep
        }`}>
          {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
        </div>
        <span className={`mt-2 text-xs font-medium ${
          isActive ? 'text-blue-500' : darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {step.name}
        </span>
      </div>
    );
  };

  const DataUploadStep = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4">Upload Client Data</h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Client Notes Upload */}
        <div className={styles.card}>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <FileText size={20} className="text-blue-500" />
            Client Notes
          </h4>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Upload a text file containing client information, games, competitors, excluded topics, and sources. Supports .txt, .md, .doc, .docx, and .rtf formats.
            </p>
            
            <div className={`border-2 border-dashed ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded-lg p-6 text-center transition-colors hover:border-blue-500`}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.doc,.docx,.rtf"
                onChange={(e) => handleFileUpload(e, 'clientNotes')}
                className="hidden"
              />
              
              {uploadedFiles.clientNotes ? (
                <div className="space-y-2">
                  <CheckCircle size={32} className="text-green-500 mx-auto" />
                  <p className="font-medium">{uploadedFiles.clientNotes.name}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    Replace file
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer space-y-2"
                >
                  <Upload size={32} className="text-gray-400 mx-auto" />
                  <p className="text-sm">Click to upload client notes</p>
                </div>
              )}
            </div>

            {parsedData.clientNotes && (
              <div className="mt-4 p-3 bg-green-900/20 rounded-md">
                <p className="text-sm text-green-400">✓ Parsed: {parsedData.clientNotes.clientName}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {parsedData.clientNotes.industry && `Industry: ${parsedData.clientNotes.industry} | `}
                  {parsedData.clientNotes.games.length > 0 && `${parsedData.clientNotes.games.length} products, `}
                  {parsedData.clientNotes.competitors.length} competitors
                  {parsedData.clientNotes.sources.tier1.length > 0 && `, ${Object.values(parsedData.clientNotes.sources).flat().length} sources`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Search Terms Upload */}
        <div className={styles.card}>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Search size={20} className="text-green-500" />
            Search Terms
          </h4>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Upload a file containing Boolean search strings (one per line).
            </p>
            
            <div className={`border-2 border-dashed ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded-lg p-6 text-center transition-colors hover:border-green-500`}>
              <input
                ref={searchTermsInputRef}
                type="file"
                accept=".txt,.csv"
                onChange={(e) => handleFileUpload(e, 'searchTerms')}
                className="hidden"
              />
              
              {uploadedFiles.searchTerms ? (
                <div className="space-y-2">
                  <CheckCircle size={32} className="text-green-500 mx-auto" />
                  <p className="font-medium">{uploadedFiles.searchTerms.name}</p>
                  <button
                    onClick={() => searchTermsInputRef.current?.click()}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    Replace file
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => searchTermsInputRef.current?.click()}
                  className="cursor-pointer space-y-2"
                >
                  <Upload size={32} className="text-gray-400 mx-auto" />
                  <p className="text-sm">Click to upload search terms</p>
                </div>
              )}
            </div>

            {parsedData.searchTerms && (
              <div className="mt-4 p-3 bg-green-900/20 rounded-md">
                <p className="text-sm text-green-400">✓ Parsed {parsedData.searchTerms.length} search strings</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sample Format */}
      <div className={styles.card}>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Eye size={20} className="text-purple-500" />
          Expected Format Examples
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-2">Client Notes Format Examples:</p>
            <div className={styles.codeBlock}>
              <pre className="text-xs">
{`Example 1 - Simple Format:
Client: Activision Blizzard
Industry: Video Game Publishing
Games: Call of Duty, Overwatch, World of Warcraft
Competitors: EA, Ubisoft, Nintendo
Excluded Topics:
- Executive compensation
- Workplace controversies
Tier 1 Sources: IGN, GameSpot, Polygon

Example 2 - Detailed Format:
Rackspace Client Notes
Base Information
Competitive Intelligence: IBM, Tierpoint, 
WiPro, Accenture, Cloudreach, DXC
Industry Insights: Top trends related to 
cloud industry, hybrid cloud, multi-cloud
Highlighted Sources:
Bloomberg (BLOOM)
CRN (CRN)
Forbes (FORBES)`}
              </pre>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Search Terms Format:</p>
            <div className={styles.codeBlock}>
              <pre className="text-xs">
{`"Call of Duty" AND ("update" OR "season")
"Overwatch 2" AND ("patch" OR "hero")
"gaming industry" AND "2025" NOT "layoffs"`}
              </pre>
            </div>
          </div>
        </div>
        <div className={`mt-4 p-3 rounded-md ${
          darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-300'
        } border`}>
          <p className="text-sm flex items-center gap-2">
            <AlertCircle size={16} className="text-blue-500" />
            <span>The parser will attempt to extract information from various document formats. Complex Word documents may require manual review.</span>
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 justify-center">
        <button 
          onClick={() => {
            // Use sample data
            setWorkflowData(prev => ({
              ...prev,
              clientName: 'Activision Blizzard',
              industry: 'Video Game Publishing'
            }));
            setCurrentStep(1);
          }}
          className={`${styles.button} ${styles.secondaryButton} text-sm`}
        >
          Use Sample Data
        </button>
        <button 
          disabled={!uploadedFiles.clientNotes && !uploadedFiles.searchTerms}
          onClick={() => setCurrentStep(1)}
          className={`${styles.button} ${styles.primaryButton} text-sm ${
            (!uploadedFiles.clientNotes && !uploadedFiles.searchTerms) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          Continue with Uploads
        </button>
      </div>
    </div>
  );

  const ClientSelectionStep = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4">Select Client Profile</h3>
      
      {/* Show parsed client if available */}
      {parsedData.clientNotes && (
        <div className={`${styles.card} ring-2 ring-green-500 mb-4`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <FileUp size={20} className="text-green-500" />
                {parsedData.clientNotes.clientName}
              </h4>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{parsedData.clientNotes.industry}</p>
            </div>
            <span className={`${styles.badge} ${styles.successBadge}`}>
              Uploaded Client
            </span>
          </div>
        </div>
      )}
      
      <div className="grid gap-4">
        {sampleClients.map(client => (
          <div 
            key={client.id}
            className={`${styles.card} cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all ${
              workflowData.clientName === client.name ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setWorkflowData(prev => ({ 
              ...prev, 
              clientName: client.name,
              industry: client.industry
            }))}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-lg">{client.name}</h4>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{client.industry}</p>
              </div>
              {client.status && (
                <span className={`${styles.badge} ${
                  client.status === 'Active' ? styles.successBadge : styles.warningBadge
                }`}>
                  {client.status}
                </span>
              )}
            </div>
            {client.briefingSpecs && (
              <div className="mt-4 text-sm space-y-1">
                <p><span className="font-medium">Schedule:</span> {client.briefingSpecs.schedule}</p>
                <p><span className="font-medium">Length:</span> {client.briefingSpecs.length}</p>
                <p><span className="font-medium">Audience:</span> {client.briefingSpecs.audience}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const InputCollectionStep = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4">Base Prompts with Client/Industry Specifics</h3>
      
      <div className={styles.card}>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <FileText size={20} className="text-blue-500" />
          Client-Focused Prompt Template
        </h4>
        <div className={styles.codeBlock}>
          <pre className="whitespace-pre-wrap">
{`Task:
You are a 15-year veteran qualitative analyst 
producing content for a daily media monitoring 
newsletter for ${workflowData.clientName || '[client]'} in ${workflowData.industry || '[client_industry]'}, 
featuring brief summaries...

Client-Specific Guidance:
- Primary focus: Corporate news about ${workflowData.clientName || '[client]'}
- Game properties: ${workflowData.clientName === 'Activision Blizzard' ? 
  'Call of Duty, Overwatch, World of Warcraft, Hearthstone, Diablo' : '[major properties]'}
- Max length: ${workflowData.clientName === 'Activision Blizzard' ? 
  '25 summaries or 3 pages (whichever is shorter)' : '[briefing length]'}

Keyword Sensitivity:
Prioritize the following keywords based on 
their relevance to the client:
• High-Priority (Weight: 10): Focus on 
  capturing detailed information... Keywords 
  include [high-priority keywords]
• Medium-Priority (Weight: 7): Include these 
  keywords... Keywords include [medium-priority 
  keywords]
• Low-Priority (Weight: 4): Background context
• Contextual Keywords: Emerging themes
• Emerging Topics: Future-focused content`}
          </pre>
        </div>
      </div>

      {/* Show uploaded search terms if available */}
      {parsedData.searchTerms && parsedData.searchTerms.length > 0 && (
        <div className={`${styles.card} border-green-500 border-opacity-30`}>
          <h4 className="font-medium mb-3 flex items-center gap-2 text-green-400">
            <Upload size={20} />
            Uploaded Search Terms ({parsedData.searchTerms.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {parsedData.searchTerms.slice(0, 5).map((term, i) => (
              <div key={i} className={`${styles.codeBlock} text-xs`}>
                {term}
              </div>
            ))}
            {parsedData.searchTerms.length > 5 && (
              <p className="text-sm text-gray-400 text-center">
                ... and {parsedData.searchTerms.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {workflowData.clientName === 'Activision Blizzard' && (
        <>
          <div className={`${styles.card} border-red-500 border-opacity-30`}>
            <h4 className="font-medium mb-3 flex items-center gap-2 text-red-400">
              <AlertTriangle size={20} />
              Content Exclusion Rules
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Negative coverage of C-level executives (Bobby Kotick, Daniel Alegre, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Executive compensation discussions (except positive coverage)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Articles from Motley Fool or Seeking Alpha</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Workplace controversies or legal disputes</span>
              </li>
            </ul>
          </div>

          <div className={styles.card}>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Clock size={20} className="text-purple-500" />
              Temporal Intelligence Settings
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Peak Update Hours</p>
                <div className="flex flex-wrap gap-2">
                  {['6:00 AM PT', '12:00 PM PT', '3:00 PM PT'].map((time, i) => (
                    <span key={i} className={`${styles.badge} ${styles.purpleBadge}`}>
                      {time}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Source Update Frequency</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Tier 1 Sources:</span>
                    <span className="font-medium">Hourly</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tier 2 Sources:</span>
                    <span className="font-medium">Every 2-3 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hand Search:</span>
                    <span className="font-medium">Twice daily</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const ClientNotesIntegrationStep = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4">Client Notes as Search Intelligence</h3>
      
      <div className={`${styles.card} bg-gradient-to-br ${
        darkMode ? 'from-blue-900/20 to-purple-900/20' : 'from-blue-50 to-purple-50'
      }`}>
        <h4 className="font-medium mb-3 text-blue-400">Processed Client Intelligence</h4>
        
        {/* Keyword Categories */}
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <span className="text-green-500">●</span> High-Priority Keywords (Weight: 10)
            </p>
            <div className="flex flex-wrap gap-2">
              {workflowData.highPriorityKeywords.map((keyword, i) => (
                <span key={i} className={`${styles.badge} ${styles.successBadge}`}>
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <span className="text-yellow-500">●</span> Medium-Priority Keywords (Weight: 7)
            </p>
            <div className="flex flex-wrap gap-2">
              {workflowData.mediumPriorityKeywords.map((keyword, i) => (
                <span key={i} className={`${styles.badge} ${styles.warningBadge}`}>
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <span className="text-gray-500">●</span> Low-Priority Keywords (Weight: 4)
            </p>
            <div className="flex flex-wrap gap-2">
              {workflowData.lowPriorityKeywords.map((keyword, i) => (
                <span key={i} className={`${styles.badge} ${styles.grayBadge}`}>
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <span className="text-purple-500">●</span> Contextual Keywords
            </p>
            <div className="flex flex-wrap gap-2">
              {workflowData.contextualKeywords.map((keyword, i) => (
                <span key={i} className={`${styles.badge} ${styles.purpleBadge}`}>
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <span className="text-blue-500">●</span> Emerging Topics
            </p>
            <div className="flex flex-wrap gap-2">
              {workflowData.emergingTopics.map((topic, i) => (
                <span key={i} className={`${styles.badge} ${styles.infoBadge}`}>
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Source Hierarchy */}
      <div className={styles.card}>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Globe size={20} className="text-green-500" />
          Source Prioritization Hierarchy
        </h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium mb-2 text-green-400">Tier 1 Sources (Primary)</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {workflowData.prioritySources.tier1.map((source, i) => (
                <span key={i} className={`${styles.badge} ${styles.successBadge}`}>
                  {source}
                </span>
              ))}
            </div>
            
            <p className="text-sm font-medium mb-2 text-yellow-400">Tier 2 Sources (Secondary)</p>
            <div className="flex flex-wrap gap-2">
              {workflowData.prioritySources.tier2.map((source, i) => (
                <span key={i} className={`${styles.badge} ${styles.warningBadge}`}>
                  {source}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2 text-gray-400">Tier 3 Sources (Supplementary)</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {workflowData.prioritySources.tier3.map((source, i) => (
                <span key={i} className={`${styles.badge} ${styles.grayBadge}`}>
                  {source}
                </span>
              ))}
            </div>
            
            <p className="text-sm font-medium mb-2 text-purple-400">Hand Search Required</p>
            <div className="flex flex-wrap gap-2">
              {workflowData.prioritySources.handSearch.map((source, i) => (
                <span key={i} className={`${styles.badge} ${styles.purpleBadge}`}>
                  {source}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Competitive Intelligence */}
      <div className={styles.card}>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Users size={20} className="text-orange-500" />
          Competitive Intelligence Matrix
        </h4>
        <div className="space-y-3">
          {workflowData.competitors.map((competitor, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`${styles.badge} ${
                  competitor.priority === 'high' ? styles.errorBadge :
                  competitor.priority === 'medium' ? styles.warningBadge :
                  styles.grayBadge
                }`}>
                  {competitor.priority}
                </span>
                <span className="font-medium">{competitor.name}</span>
              </div>
              <span className="text-sm text-gray-400">{competitor.type} competitor</span>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Performance */}
      {workflowData.historicalInsights && (
        <div className={styles.card}>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-500" />
            Historical Performance Insights
          </h4>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-green-500">
                  {workflowData.historicalInsights.relevanceScore}%
                </p>
                <p className="text-sm mt-1">Relevance Score</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Open Rate:</span>
                  <span className="font-medium">{workflowData.historicalInsights.engagementMetrics.avgOpenRate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Click Rate:</span>
                  <span className="font-medium">{workflowData.historicalInsights.engagementMetrics.avgClickRate}%</span>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium mb-2">Top Performing Topics</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {workflowData.historicalInsights.topPerformingTopics.map((topic, i) => (
                  <span key={i} className={`${styles.badge} ${styles.successBadge}`}>
                    {topic}
                  </span>
                ))}
              </div>
              <p className="text-sm font-medium mb-2">Top Clicked Sections</p>
              <div className="flex flex-wrap gap-2">
                {workflowData.historicalInsights.engagementMetrics.topClickedSections.map((section, i) => (
                  <span key={i} className={`${styles.badge} ${styles.infoBadge}`}>
                    {section}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Filtering Rules */}
      {workflowData.excludedTopics.length > 0 && (
        <div className={`${styles.card} border-red-500 border-opacity-30`}>
          <h4 className="font-medium mb-3 flex items-center gap-2 text-red-400">
            <Filter size={20} />
            Dynamic Content Filtering Rules
          </h4>
          <div className="space-y-3">
            {workflowData.excludedTopics.map((topic, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded hover:bg-red-900/20 transition-colors">
                <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{topic}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-md bg-red-900/20 border border-red-700">
            <p className="text-sm">
              <strong>Sensitivity Level:</strong> High - All matching content will be automatically filtered and logged for review.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const SearchStringGenerationStep = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4">Intelligent Search String Generation</h3>
      
      <div className={styles.card}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium flex items-center gap-2">
            <Search size={20} className="text-green-500" />
            Generated Boolean Search Strings ({workflowData.searchStrings.length} total)
          </h4>
          <button 
            onClick={() => setShowTestResults(!showTestResults)}
            className={`${styles.button} ${styles.secondaryButton} text-sm px-4 py-2`}
          >
            {showTestResults ? 'Hide Test Results' : 'Test Search'}
          </button>
        </div>
        
        {/* Show uploaded search terms first if available */}
        {parsedData.searchTerms && parsedData.searchTerms.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2 text-green-400">Uploaded Search Terms</p>
            <div className="space-y-2">
              {parsedData.searchTerms.slice(0, 3).map((string, i) => (
                <div key={`uploaded-${i}`} className={`${styles.codeBlock} hover:bg-opacity-80 transition-colors border-green-500 border-opacity-30`}>
                  <code className="text-xs">{string}</code>
                  {showTestResults && (
                    <div className="mt-2 text-xs text-green-400">
                      ✓ Custom search string from upload
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Search String Categories */}
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2 text-blue-400">Corporate & Executive Searches</p>
            <div className="space-y-2">
              {workflowData.searchStrings.slice(0, 4).map((string, i) => (
                <div key={i} className={`${styles.codeBlock} hover:bg-opacity-80 transition-colors`}>
                  <code className="text-xs">{string}</code>
                  {showTestResults && (
                    <div className="mt-2 text-xs text-green-400">
                      ✓ Est. 12-18 results | 95% relevance | 3 Tier 1 sources
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-2 text-green-400">Game-Specific Searches</p>
            <div className="space-y-2">
              {workflowData.searchStrings.slice(4, 9).map((string, i) => (
                <div key={i + 4} className={`${styles.codeBlock} hover:bg-opacity-80 transition-colors`}>
                  <code className="text-xs">{string}</code>
                  {showTestResults && (
                    <div className="mt-2 text-xs text-green-400">
                      ✓ Est. 20-30 results | 88% relevance | Mixed sources
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className={`mt-4 p-3 rounded-md ${
          darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-300'
        } border`}>
          <p className="text-sm flex items-center gap-2">
            <Activity size={16} className="text-green-500" />
            <span>Search strings optimized for {workflowData.searchStrings.length} queries across {Object.keys(workflowData.prioritySources).length} source tiers.</span>
          </p>
        </div>
      </div>

      {/* Search Optimization Intelligence */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className={styles.card}>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <BarChart size={20} className="text-blue-500" />
            Search Optimization Parameters
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Exclusion operators (NOT) for sensitive content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Date parameters for current content (2025, Q1)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Wildcard operators (*) for variations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Phrase matching for exact terms</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span>Regional modifiers for global coverage</span>
            </li>
          </ul>
        </div>
        
        <div className={styles.card}>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Clock size={20} className="text-purple-500" />
            Temporal Search Strategy
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Morning Sweep (6 AM):</span>
              <span className="font-medium">Overnight news + Asia coverage</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Midday Update (12 PM):</span>
              <span className="font-medium">Breaking news + earnings</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Afternoon Check (3 PM):</span>
              <span className="font-medium">Market close + West Coast</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Hand Search:</span>
              <span className="font-medium">10 AM + 4 PM specialized sites</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const QualityAssuranceStep = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4">Quality Assurance & Validation</h3>
      
      {/* Quality Metrics Dashboard */}
      <div className={styles.card}>
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <CheckSquare size={20} className="text-green-500" />
          Automated Quality Checks
        </h4>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-green-900/20 border border-green-700">
            <CheckCircle size={24} className="text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-500">Pass</p>
            <p className="text-sm mt-1">Relevance Score: 92%</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-green-900/20 border border-green-700">
            <CheckCircle size={24} className="text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-500">Pass</p>
            <p className="text-sm mt-1">Duplication: 8%</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-yellow-900/20 border border-yellow-700">
            <AlertCircle size={24} className="text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-500">Warning</p>
            <p className="text-sm mt-1">Source Balance</p>
          </div>
        </div>
      </div>

      {/* Content Balance Analysis */}
      <div className={styles.card}>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <BarChart size={20} className="text-blue-500" />
          Content Distribution Analysis
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Corporate News</span>
            <div className="flex items-center gap-2">
              <div className="w-48 bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: '42%'}}></div>
              </div>
              <span className="text-sm font-medium">42% (Target: 40%)</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Product Updates</span>
            <div className="flex items-center gap-2">
              <div className="w-48 bg-gray-700 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '38%'}}></div>
              </div>
              <span className="text-sm font-medium">38% (Target: 35%)</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Competitive Intel</span>
            <div className="flex items-center gap-2">
              <div className="w-48 bg-gray-700 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{width: '12%'}}></div>
              </div>
              <span className="text-sm font-medium">12% (Target: 15%)</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Industry News</span>
            <div className="flex items-center gap-2">
              <div className="w-48 bg-gray-700 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{width: '8%'}}></div>
              </div>
              <span className="text-sm font-medium">8% (Target: 10%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Source Distribution */}
      <div className={styles.card}>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Globe size={20} className="text-green-500" />
          Source Distribution Visualization
        </h4>
        <div className="grid md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-green-500">45%</p>
            <p className="text-sm mt-1">Tier 1 Sources</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-yellow-500">30%</p>
            <p className="text-sm mt-1">Tier 2 Sources</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-500">15%</p>
            <p className="text-sm mt-1">Tier 3 Sources</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-purple-500">10%</p>
            <p className="text-sm mt-1">Hand Search</p>
          </div>
        </div>
        <div className={`mt-4 p-3 rounded-md ${
          darkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-300'
        } border`}>
          <p className="text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-500" />
            <span>Recommendation: Increase Tier 1 source coverage by 5% for optimal authority balance.</span>
          </p>
        </div>
      </div>

      {/* Sensitivity Check */}
      <div className={`${styles.card} border-red-500 border-opacity-30`}>
        <h4 className="font-medium mb-3 flex items-center gap-2 text-red-400">
          <Shield size={20} />
          Sensitivity Check Results
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 rounded bg-red-900/20">
            <span className="text-sm">2 articles flagged for executive compensation mentions</span>
            <span className={`${styles.badge} ${styles.errorBadge}`}>Blocked</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-red-900/20">
            <span className="text-sm">1 article from Motley Fool detected</span>
            <span className={`${styles.badge} ${styles.errorBadge}`}>Blocked</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-green-900/20">
            <span className="text-sm">0 workplace controversy articles detected</span>
            <span className={`${styles.badge} ${styles.successBadge}`}>Clear</span>
          </div>
        </div>
      </div>
    </div>
  );

  const FinalAssemblyStep = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold mb-4">Final Assembled Prompt & Search Package</h3>
      
      <div className={styles.card}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            Complete Intelligence Package Ready
          </h4>
          <span className={`${styles.badge} ${styles.successBadge}`}>
            Ready for Production
          </span>
        </div>
        
        <div className={styles.codeBlock}>
          <pre className="whitespace-pre-wrap text-xs">
{`Task:
You are a 15-year veteran qualitative analyst producing content for a daily media monitoring
newsletter for ${workflowData.clientName} in ${workflowData.industry}, featuring brief summaries...

Client-Specific Guidance:
- Primary Audience: Comms Team & Executives
- Briefing Format: Morning Briefing, Monday-Friday 7:00 AM PT
- Length Requirement: Maximum 25 summaries or 3 pages (whichever is shorter)
- Summary Style: 2 sentences capturing the heart of the article
- Headline Format: Use original article headline unaltered

Keyword Sensitivity Matrix:
High-Priority (Weight: 10): ${workflowData.highPriorityKeywords.join(', ')}
Medium-Priority (Weight: 7): ${workflowData.mediumPriorityKeywords.join(', ')}
Low-Priority (Weight: 4): ${workflowData.lowPriorityKeywords.join(', ')}
Contextual Keywords: ${workflowData.contextualKeywords.join(', ')}
Emerging Topics: ${workflowData.emergingTopics.join(', ')}

Competitive Intelligence Targets:
${workflowData.competitors.map(c => `- ${c.name} (${c.type} competitor, ${c.priority} priority)`).join('\n')}

CRITICAL EXCLUSION RULES:
${workflowData.excludedTopics.map(topic => `- ${topic}`).join('\n')}

Source Prioritization:
Tier 1 (Primary - Check Hourly): ${workflowData.prioritySources.tier1.join(', ')}
Tier 2 (Secondary - Check 2-3 hrs): ${workflowData.prioritySources.tier2.join(', ')}
Tier 3 (Supplementary - Check Daily): ${workflowData.prioritySources.tier3.join(', ')}
Hand Search Required (2x Daily): ${workflowData.prioritySources.handSearch.join(', ')}

Search Queries Being Executed (${workflowData.searchStrings.length} total):
${workflowData.searchStrings.map((query, i) => `${i + 1}. ${query}`).join('\n')}

Output Format & Sections:
${workflowData.clientName.toLowerCase().includes('rackspace') ? 
`1. "Rackspace Technology In The News" - Corporate stories
2. "FAIR" - AI by Rackspace content (if applicable)
3. "OpenStack" - Open standard cloud computing platform
4. "Key Social Media" - Top Twitter and Most Shared Stories
5. "Competitive Intelligence" - IBM, Tierpoint, WiPro, etc.
6. "Industry Insights" - Cloud industry trends
7. "Policy & Regulatory" - Regulations affecting cloud/tech` :
workflowData.clientName.toLowerCase().includes('activision') ?
`1. "Activision Blizzard in the News" - Corporate stories
2. "Activision" - Activision-specific news
3. "Blizzard" - Blizzard Entertainment news
4. "King Digital" - Mobile gaming division
5. "eSports" - Competitive gaming coverage
6. "Competitive Intelligence" - Competitor news
7. "Industry & Policy Update" - Market trends` :
`1. "${workflowData.clientName} in the News" - Corporate stories
2. "Product Updates" - Product-specific news
3. "Competitive Intelligence" - Competitor news
4. "Industry Update" - Market trends`}

Quality Requirements:
- Minimum Relevance Score: ${workflowData.qualityMetrics.minRelevanceScore}%
- Maximum Duplication: ${workflowData.qualityMetrics.maxDuplication}%
- Content Balance: Corporate (${workflowData.qualityMetrics.balanceTargets.corporate || 40}%), 
  Product (${workflowData.qualityMetrics.balanceTargets.product || 35}%), 
  Competitive (${workflowData.qualityMetrics.balanceTargets.competitive || 15}%), 
  Industry (${workflowData.qualityMetrics.balanceTargets.industry || 10}%)

Historical Performance Optimization:
- Focus on topics with ${workflowData.historicalInsights?.relevanceScore || 'N/A'}% relevance rating
- Prioritize sections with high engagement
- Avoid flagged topics`}
          </pre>
        </div>
        
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className={styles.card}>
            <h5 className="font-medium mb-3 flex items-center gap-2">
              <Activity size={18} className="text-green-500" />
              Package Statistics
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Search Queries:</span>
                <span className="font-medium">{workflowData.searchStrings.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Monitored Sources:</span>
                <span className="font-medium">{[...workflowData.prioritySources.tier1, ...workflowData.prioritySources.tier2, ...workflowData.prioritySources.tier3, ...workflowData.prioritySources.handSearch].length}</span>
              </div>
              <div className="flex justify-between">
                <span>Keywords Tracked:</span>
                <span className="font-medium">{workflowData.highPriorityKeywords.length + workflowData.mediumPriorityKeywords.length + workflowData.lowPriorityKeywords.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Exclusion Rules:</span>
                <span className="font-medium">{workflowData.excludedTopics.length}</span>
              </div>
            </div>
          </div>
          
          <div className={styles.card}>
            <h5 className="font-medium mb-3 flex items-center gap-2">
              <Clock size={18} className="text-purple-500" />
              Next Actions
            </h5>
            <div className="space-y-3">
              <button className={`${styles.button} ${styles.primaryButton} w-full flex items-center justify-center gap-2`}>
                <Search size={20} />
                Execute Search Package
              </button>
              <button className={`${styles.button} ${styles.secondaryButton} w-full flex items-center justify-center gap-2`}>
                <FileText size={20} />
                Preview Sample Briefing
              </button>
              <button 
                onClick={exportConfiguration}
                className={`${styles.button} ${styles.secondaryButton} w-full flex items-center justify-center gap-2`}
              >
                <Download size={20} />
                Export Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return <DataUploadStep />;
      case 1: return <ClientSelectionStep />;
      case 2: return <InputCollectionStep />;
      case 3: return <ClientNotesIntegrationStep />;
      case 4: return <SearchStringGenerationStep />;
      case 5: return <QualityAssuranceStep />;
      case 6: return <FinalAssemblyStep />;
      default: return null;
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Client Briefing Production Platform</h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              AI-Enhanced Search Intelligence Workflow
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`${styles.button} ${styles.secondaryButton} p-3`}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {workflowSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                <StepIndicator step={step} index={index} />
                {index < workflowSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    currentStep > index 
                      ? 'bg-green-600' 
                      : darkMode ? 'bg-gray-700' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className={`${styles.card} min-h-[600px]`}>
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className={`${styles.button} ${styles.secondaryButton} ${
              currentStep === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Previous Step
          </button>
          
          {currentStep < workflowSteps.length - 1 && (
            <button
              onClick={handleNextStep}
              disabled={isProcessing || (currentStep === 1 && !workflowData.clientName)}
              className={`${styles.button} ${styles.primaryButton} flex items-center gap-2 ${
                (currentStep === 1 && !workflowData.clientName) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                <>
                  Next Step
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          )}
        </div>

        {/* Status Messages */}
        {processingStatus && (
          <div className={`mt-4 p-3 rounded-md text-center ${
            processingStatus.includes('Error') 
              ? 'bg-red-900/20 text-red-400 border border-red-700' 
              : 'bg-green-900/20 text-green-400 border border-green-700'
          }`}>
            {processingStatus}
          </div>
        )}

        {/* Client Notes Reference */}
        {workflowData.clientName && currentStep > 0 && (
          <div className={`mt-6 ${styles.card} bg-opacity-50`}>
            <p className="text-xs text-center">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {uploadedFiles.clientNotes 
                  ? `Using uploaded client notes: ${uploadedFiles.clientNotes.name}` 
                  : `Using ${workflowData.clientName} template data`}
                {uploadedFiles.searchTerms && ` | Search terms: ${uploadedFiles.searchTerms.name}`}
              </span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default BriefingWorkflowPrototype;