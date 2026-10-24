/**
 * AI HEAVEN - Turnitout Decoupled Deterministic Rules & Academic Taxonomies
 * 
 * Implements architectural rule decoupling:
 * 1. AI cliché phrases & formal academic alternatives
 * 2. Penn Discourse Treebank (PDTB 2.0) / RST transitions
 * 3. Five academic discipline taxonomies with peer-reviewed literature seeds for citation generation
 */

import { AcademicDiscipline, BibTeXEntry } from '../../types/turnitout';

export interface ClicheRule {
  pattern: RegExp;
  phrase: string;
  alternatives: string[];
  category: 'overused_verb' | 'inflated_idiom' | 'stiff_transition' | 'empty_qualifier';
}

export const AI_CLICHE_RULES: ClicheRule[] = [
  {
    pattern: /\bdelve(?:\s+deeply)?\s+into\b/gi,
    phrase: 'delve into',
    alternatives: ['examine', 'investigate', 'analyze', 'explore in detail'],
    category: 'overused_verb'
  },
  {
    pattern: /\bdelves\s+into\b/gi,
    phrase: 'delves into',
    alternatives: ['examines', 'investigates', 'analyzes', 'surveys'],
    category: 'overused_verb'
  },
  {
    pattern: /\bdelving\s+into\b/gi,
    phrase: 'delving into',
    alternatives: ['examining', 'investigating', 'analyzing'],
    category: 'overused_verb'
  },
  {
    pattern: /\bplays\s+a\s+pivotal\s+role(?:\s+in)?\b/gi,
    phrase: 'plays a pivotal role in',
    alternatives: ['is essential to', 'serves a critical function in', 'acts as a cornerstone of', 'is foundational to'],
    category: 'inflated_idiom'
  },
  {
    pattern: /\bplay\s+a\s+pivotal\s+role(?:\s+in)?\b/gi,
    phrase: 'play a pivotal role in',
    alternatives: ['are essential to', 'serve a critical function in', 'act as cornerstones of'],
    category: 'inflated_idiom'
  },
  {
    pattern: /\bserves?\s+as\s+a\s+testament\s+to\b/gi,
    phrase: 'serves as a testament to',
    alternatives: ['demonstrates', 'attests to', 'provides evidence of', 'reflects'],
    category: 'inflated_idiom'
  },
  {
    pattern: /\ba\s+comprehensive\s+tapestry(?:\s+of)?\b/gi,
    phrase: 'a comprehensive tapestry of',
    alternatives: ['an integrated framework of', 'a multifaceted network of', 'a structured corpus of'],
    category: 'inflated_idiom'
  },
  {
    pattern: /\bin\s+conclusion,\s*/gi,
    phrase: 'in conclusion,',
    alternatives: ['Ultimately,', 'Taken together,', 'In summary,', 'The findings indicate that'],
    category: 'stiff_transition'
  },
  {
    pattern: /\bit\s+is\s+crucial\s+to\s+(?:note|remember)\s+that\b/gi,
    phrase: 'it is crucial to note that',
    alternatives: ['Notably,', 'Specifically,', 'Importantly,', 'Significantly,'],
    category: 'empty_qualifier'
  },
  {
    pattern: /\bit\s+is\s+worth\s+noting\s+that\b/gi,
    phrase: 'it is worth noting that',
    alternatives: ['Notably,', 'Specifically,', 'In particular,'],
    category: 'empty_qualifier'
  },
  {
    pattern: /\bbeacon\s+of\b/gi,
    phrase: 'beacon of',
    alternatives: ['standard for', 'benchmark for', 'exemplar of'],
    category: 'inflated_idiom'
  },
  {
    pattern: /\bmultifaceted\b/gi,
    phrase: 'multifaceted',
    alternatives: ['diverse', 'varied', 'composite', 'multi-layered'],
    category: 'overused_verb'
  },
  {
    pattern: /\bmoreover,\s*/gi,
    phrase: 'moreover,',
    alternatives: ['Furthermore,', 'In addition,', 'Additionally,', 'Beyond this,'],
    category: 'stiff_transition'
  },
  {
    pattern: /\bfurthermore,\s*/gi,
    phrase: 'furthermore,',
    alternatives: ['In addition,', 'Moreover,', 'Additionally,', 'Complementing this,'],
    category: 'stiff_transition'
  },
  {
    pattern: /\bharness(?:ing)?\s+the\s+power\s+of\b/gi,
    phrase: 'harnessing the power of',
    alternatives: ['leveraging', 'utilizing', 'applying', 'employing'],
    category: 'inflated_idiom'
  },
  {
    pattern: /\bgroundbreaking\b/gi,
    phrase: 'groundbreaking',
    alternatives: ['novel', 'significant', 'pioneering', 'foundational'],
    category: 'inflated_idiom'
  },
  {
    pattern: /\bunravel(?:ing)?\s+the\s+mysteries\s+of\b/gi,
    phrase: 'unraveling the mysteries of',
    alternatives: ['investigating the mechanics of', 'characterizing', 'elucidating'],
    category: 'inflated_idiom'
  },
  {
    pattern: /\ba\s+plethora\s+of\b/gi,
    phrase: 'a plethora of',
    alternatives: ['a substantial number of', 'numerous', 'multiple', 'a wide array of'],
    category: 'empty_qualifier'
  },
  {
    pattern: /\bstands\s+as\s+a\b/gi,
    phrase: 'stands as a',
    alternatives: ['functions as a', 'represents a', 'constitutes a'],
    category: 'inflated_idiom'
  },
  {
    pattern: /\bin\s+the\s+realm\s+of\b/gi,
    phrase: 'in the realm of',
    alternatives: ['within the field of', 'in the context of', 'in the domain of'],
    category: 'empty_qualifier'
  }
];

export const DISCOURSE_CONNECTIVES = {
  causal: ['Consequently', 'As a direct result', 'Accordingly', 'Hence', 'Thereby'],
  contrast: ['Conversely', 'In contrast', 'Nevertheless', 'On the other hand', 'Yet'],
  elaboration: ['Specifically', 'In particular', 'To elaborate', 'Namely', 'Precisely'],
  concession: ['Although', 'While acknowledgeable', 'Granted that', 'Even so']
};

export interface DisciplineTaxonomy {
  id: AcademicDiscipline;
  name: string;
  description: string;
  keywords: string[];
  seedLiterature: BibTeXEntry[];
}

export const ACADEMIC_TAXONOMIES: Record<AcademicDiscipline, DisciplineTaxonomy> = {
  computer_science: {
    id: 'computer_science',
    name: 'Computer Science, Systems & AI',
    description: 'Machine learning, distributed systems, cryptographic security, algorithms',
    keywords: ['neural', 'transformer', 'distributed', 'algorithm', 'concurrency', 'latency', 'security', 'cache', 'runtime', 'compiler', 'gpu', 'async'],
    seedLiterature: [
      {
        citationKey: 'vaswani2017attention',
        title: 'Attention Is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit', 'Llion Jones', 'Aidan N. Gomez', 'Lukasz Kaiser', 'Illia Polosukhin'],
        year: 2017,
        journalOrConference: 'Advances in Neural Information Processing Systems (NeurIPS)',
        doi: '10.48550/arXiv.1706.03762',
        bibtexString: `@inproceedings{vaswani2017attention,\n  author = {Vaswani, Ashish and Shazeer, Noam and Parmar, Niki and Uszkoreit, Jakob and Jones, Llion and Gomez, Aidan N. and Kaiser, Lukasz and Polosukhin, Illia},\n  title = {Attention Is All You Need},\n  booktitle = {Advances in Neural Information Processing Systems (NeurIPS)},\n  year = {2017},\n  pages = {5998--6008}\n}`
      },
      {
        citationKey: 'goodfellow2014generative',
        title: 'Generative Adversarial Nets',
        authors: ['Ian Goodfellow', 'Jean Pouget-Abadie', 'Mehdi Mirza', 'Bing Xu', 'David Warde-Farley', 'Sherjil Ozair', 'Aaron Courville', 'Yoshua Bengio'],
        year: 2014,
        journalOrConference: 'Advances in Neural Information Processing Systems (NeurIPS)',
        doi: '10.48550/arXiv.1406.2661',
        bibtexString: `@inproceedings{goodfellow2014generative,\n  author = {Goodfellow, Ian and Pouget-Abadie, Jean and Mirza, Mehdi and Xu, Bing and Warde-Farley, David and Ozair, Sherjil and Courville, Aaron and Bengio, Yoshua},\n  title = {Generative Adversarial Nets},\n  booktitle = {Advances in Neural Information Processing Systems (NeurIPS)},\n  year = {2014},\n  pages = {2672--2680}\n}`
      },
      {
        citationKey: 'lamport1982byzantine',
        title: 'The Byzantine Generals Problem',
        authors: ['Leslie Lamport', 'Robert Shostak', 'Marshall Pease'],
        year: 1982,
        journalOrConference: 'ACM Transactions on Programming Languages and Systems (TOPLAS)',
        doi: '10.1145/357172.357176',
        bibtexString: `@article{lamport1982byzantine,\n  author = {Lamport, Leslie and Shostak, Robert and Pease, Marshall},\n  title = {The Byzantine Generals Problem},\n  journal = {ACM Trans. Program. Lang. Syst.},\n  volume = {4},\n  number = {3},\n  pages = {382--401},\n  year = {1982}\n}`
      }
    ]
  },
  engineering_physics: {
    id: 'engineering_physics',
    name: 'Engineering, Signal Processing & Physics',
    description: 'Control theory, continuum mechanics, thermodynamics, fluid dynamics',
    keywords: ['kalman', 'filter', 'thermodynamics', 'fluid', 'navier-stokes', 'voltage', 'frequency', 'impedance', 'mechanics', 'signal', 'aerodynamics'],
    seedLiterature: [
      {
        citationKey: 'kalman1960new',
        title: 'A New Approach to Linear Filtering and Prediction Problems',
        authors: ['Rudolf E. Kalman'],
        year: 1960,
        journalOrConference: 'Journal of Basic Engineering',
        doi: '10.1115/1.3662552',
        bibtexString: `@article{kalman1960new,\n  author = {Kalman, Rudolf Emil},\n  title = {A New Approach to Linear Filtering and Prediction Problems},\n  journal = {Journal of Basic Engineering},\n  volume = {82},\n  number = {1},\n  pages = {35--45},\n  year = {1960}\n}`
      },
      {
        citationKey: 'shannon1948mathematical',
        title: 'A Mathematical Theory of Communication',
        authors: ['Claude E. Shannon'],
        year: 1948,
        journalOrConference: 'Bell System Technical Journal',
        doi: '10.1002/j.1538-7305.1948.tb01338.x',
        bibtexString: `@article{shannon1948mathematical,\n  author = {Shannon, Claude Elwood},\n  title = {A Mathematical Theory of Communication},\n  journal = {Bell System Technical Journal},\n  volume = {27},\n  number = {3},\n  pages = {379--423},\n  year = {1948}\n}`
      }
    ]
  },
  mathematics_statistics: {
    id: 'mathematics_statistics',
    name: 'Mathematics, Probability & Statistics',
    description: 'Statistical inference, differential geometry, topology, optimization',
    keywords: ['estimator', 'bayes', 'differential', 'stochastic', 'markov', 'topology', 'eigenvalue', 'convex', 'norm', 'convergence', 'manifold'],
    seedLiterature: [
      {
        citationKey: 'tibshirani1996regression',
        title: 'Regression Shrinkage and Selection via the Lasso',
        authors: ['Robert Tibshirani'],
        year: 1996,
        journalOrConference: 'Journal of the Royal Statistical Society: Series B (Methodological)',
        doi: '10.1111/j.2517-6161.1996.tb02080.x',
        bibtexString: `@article{tibshirani1996regression,\n  author = {Tibshirani, Robert},\n  title = {Regression Shrinkage and Selection via the Lasso},\n  journal = {Journal of the Royal Statistical Society: Series B (Methodological)},\n  volume = {58},\n  number = {1},\n  pages = {267--288},\n  year = {1996}\n}`
      },
      {
        citationKey: 'efron1979bootstrap',
        title: 'Bootstrap Methods: Another Look at the Jackknife',
        authors: ['Bradley Efron'],
        year: 1979,
        journalOrConference: 'The Annals of Statistics',
        doi: '10.1214/aos/1176344552',
        bibtexString: `@article{efron1979bootstrap,\n  author = {Efron, Bradley},\n  title = {Bootstrap Methods: Another Look at the Jackknife},\n  journal = {The Annals of Statistics},\n  volume = {7},\n  number = {1},\n  pages = {1--26},\n  year = {1979}\n}`
      }
    ]
  },
  quantitative_finance: {
    id: 'quantitative_finance',
    name: 'Quantitative Finance & Econometrics',
    description: 'Asset pricing, stochastic volatility, portfolio optimization, risk modeling',
    keywords: ['volatility', 'arbitrage', 'portfolio', 'black-scholes', 'option', 'hedging', 'liquidity', 'yield', 'econometrics', 'sharpe', 'derivatives'],
    seedLiterature: [
      {
        citationKey: 'black1973pricing',
        title: 'The Pricing of Options and Corporate Liabilities',
        authors: ['Fischer Black', 'Myron Scholes'],
        year: 1973,
        journalOrConference: 'Journal of Political Economy',
        doi: '10.1086/260062',
        bibtexString: `@article{black1973pricing,\n  author = {Black, Fischer and Scholes, Myron},\n  title = {The Pricing of Options and Corporate Liabilities},\n  journal = {Journal of Political Economy},\n  volume = {81},\n  number = {3},\n  pages = {637--654},\n  year = {1973}\n}`
      },
      {
        citationKey: 'markowitz1952portfolio',
        title: 'Portfolio Selection',
        authors: ['Harry Markowitz'],
        year: 1952,
        journalOrConference: 'The Journal of Finance',
        doi: '10.1111/j.1540-6261.1952.tb01525.x',
        bibtexString: `@article{markowitz1952portfolio,\n  author = {Markowitz, Harry},\n  title = {Portfolio Selection},\n  journal = {The Journal of Finance},\n  volume = {7},\n  number = {1},\n  pages = {77--91},\n  year = {1952}\n}`
      }
    ]
  },
  medical_life_sciences: {
    id: 'medical_life_sciences',
    name: 'Medical & Life Sciences',
    description: 'Genomics, bioinformatics, clinical trials, pharmacology',
    keywords: ['gene', 'protein', 'cohort', 'clinical', 'pathway', 'assay', 'pharmacology', 'double-blind', 'placebo', 'mrna', 'sequencing'],
    seedLiterature: [
      {
        citationKey: 'watson1953molecular',
        title: 'Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid',
        authors: ['James D. Watson', 'Francis H. C. Crick'],
        year: 1953,
        journalOrConference: 'Nature',
        doi: '10.1038/171737a0',
        bibtexString: `@article{watson1953molecular,\n  author = {Watson, J. D. and Crick, F. H. C.},\n  title = {Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid},\n  journal = {Nature},\n  volume = {171},\n  number = {4356},\n  pages = {737--738},\n  year = {1953}\n}`
      }
    ]
  }
};
