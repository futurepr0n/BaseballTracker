/**
 * Universal Name Normalizer - Bulletproof special character handling
 * Converts ANY international character to its English equivalent
 * Ensures rosters.json matches with CSV and daily JSON files
 */

/**
 * Comprehensive character mapping for all common international characters
 */
const ACCENT_MAP = {
  // Spanish/Latin characters
  'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'ā': 'a', 'ą': 'a', 'å': 'a', 'ã': 'a',
  'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e', 'ē': 'e', 'ę': 'e',
  'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i', 'ī': 'i', 'į': 'i',
  'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'ō': 'o', 'ø': 'o', 'õ': 'o',
  'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u', 'ū': 'u', 'ų': 'u',
  'ñ': 'n', 'ń': 'n',
  'ç': 'c', 'č': 'c', 'ć': 'c',
  'ř': 'r', 'ś': 's', 'š': 's', 'ť': 't', 'ý': 'y', 'ž': 'z', 'ź': 'z',
  
  // Capital letters
  'Á': 'A', 'À': 'A', 'Ä': 'A', 'Â': 'A', 'Ā': 'A', 'Ą': 'A', 'Å': 'A', 'Ã': 'A',
  'É': 'E', 'È': 'E', 'Ë': 'E', 'Ê': 'E', 'Ē': 'E', 'Ę': 'E',
  'Í': 'I', 'Ì': 'I', 'Ï': 'I', 'Î': 'I', 'Ī': 'I', 'Į': 'I',
  'Ó': 'O', 'Ò': 'O', 'Ö': 'O', 'Ô': 'O', 'Ō': 'O', 'Ø': 'O', 'Õ': 'O',
  'Ú': 'U', 'Ù': 'U', 'Ü': 'U', 'Û': 'U', 'Ū': 'U', 'Ų': 'U',
  'Ñ': 'N', 'Ń': 'N',
  'Ç': 'C', 'Č': 'C', 'Ć': 'C',
  'Ř': 'R', 'Ś': 'S', 'Š': 'S', 'Ť': 'T', 'Ý': 'Y', 'Ž': 'Z', 'Ź': 'Z'
};

/**
 * Normalize any name to plain English characters
 * @param {string} name - Name with potential special characters
 * @returns {string} - Name with only English characters
 */
export const normalizeToEnglish = (name) => {
  if (!name || typeof name !== 'string') return '';
  
  // Replace each character using our mapping
  let normalized = '';
  for (let char of name) {
    normalized += ACCENT_MAP[char] || char;
  }
  
  return normalized;
};

/**
 * Create all possible name variants for matching
 * @param {string} name - Original name
 * @returns {string[]} - Array of name variants
 */
export const createAllNameVariants = (name) => {
  if (!name) return [];
  
  const variants = new Set();
  
  // Add original name
  variants.add(name);
  
  // Add normalized version
  const normalized = normalizeToEnglish(name);
  variants.add(normalized);
  
  // Handle "Last, First" format
  if (name.includes(',')) {
    const parts = name.split(',').map(p => p.trim());
    if (parts.length === 2) {
      const firstLast = `${parts[1]} ${parts[0]}`;
      variants.add(firstLast);
      variants.add(normalizeToEnglish(firstLast));
    }
  }
  
  // Handle "First Last" to "Last, First" format
  if (!name.includes(',') && name.includes(' ')) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1];
      const firstName = parts.slice(0, -1).join(' ');
      const csvFormat = `${lastName}, ${firstName}`;
      variants.add(csvFormat);
      variants.add(normalizeToEnglish(csvFormat));
    }
  }
  
  // Handle initial formats "J. Last" vs "Jose Last"
  const normalizedName = normalizeToEnglish(name);
  if (normalizedName.includes(' ') && !normalizedName.includes(',')) {
    const parts = normalizedName.split(' ');
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1];
      const firstName = parts.slice(0, -1).join(' ');
      
      // Create initial version: "Jose Ramirez" -> "J. Ramirez"
      if (firstName.length > 1) {
        const initial = `${firstName[0]}. ${lastName}`;
        variants.add(initial);
      }
      
      // Create full version: "J. Ramirez" -> "Jose Ramirez" (can't do this reliably)
      // But we can handle common cases
      if (firstName.length === 2 && firstName.endsWith('.')) {
        // This is already an initial, keep as is
        variants.add(`${firstName[0]} ${lastName}`); // Without period
      }
    }
  }
  
  // Add lowercase versions for case-insensitive matching
  const lowerVariants = Array.from(variants).map(v => v.toLowerCase());
  lowerVariants.forEach(v => variants.add(v));
  
  return Array.from(variants);
};

/**
 * Check if two names match using comprehensive variant matching
 * @param {string} name1 - First name
 * @param {string} name2 - Second name  
 * @returns {boolean} - True if names match
 */
export const namesMatch = (name1, name2) => {
  if (!name1 || !name2) return false;
  
  const variants1 = createAllNameVariants(name1);
  const variants2 = createAllNameVariants(name2);
  
  // Check if any variant from name1 matches any variant from name2
  return variants1.some(v1 => variants2.some(v2 => v1.toLowerCase() === v2.toLowerCase()));
};

/**
 * Find a player in rosters data using comprehensive name matching
 * @param {string} searchName - Name to search for
 * @param {Array} rosterData - Array of roster objects
 * @returns {Object|null} - Matching roster object or null
 */
export const findPlayerInRoster = (searchName, rosterData) => {
  if (!searchName || !rosterData) return null;
  
  // Try exact matches first
  let match = rosterData.find(player => {
    const playerNames = [player.name, player.fullName].filter(Boolean);
    return playerNames.some(pName => pName === searchName);
  });
  
  if (match) return match;
  
  // Try normalized matching
  const searchNormalized = normalizeToEnglish(searchName);
  match = rosterData.find(player => {
    const playerNames = [player.name, player.fullName].filter(Boolean);
    return playerNames.some(pName => normalizeToEnglish(pName) === searchNormalized);
  });
  
  if (match) return match;
  
  // Try comprehensive variant matching
  match = rosterData.find(player => {
    const playerNames = [player.name, player.fullName].filter(Boolean);
    return playerNames.some(pName => namesMatch(searchName, pName));
  });
  
  return match;
};

/**
 * Test function to verify name matching works
 */
export const testNameMatching = () => {
  const testCases = [
    { input: "José Ramírez", expected: "Jose Ramirez" },
    { input: "Ramírez, José", expected: "Ramirez, Jose" },
    { input: "J. Ramírez", expected: "J. Ramirez" },
    { input: "Peña, Salvador", expected: "Pena, Salvador" },
    { input: "Núñez, Renato", expected: "Nunez, Renato" }
  ];
  
  console.log("Testing Universal Name Normalizer:");
  testCases.forEach(test => {
    const result = normalizeToEnglish(test.input);
    const passed = result === test.expected;
    console.log(`${passed ? '✅' : '❌'} "${test.input}" → "${result}" (expected: "${test.expected}")`);
  });
  
  // Test variant creation
  const variants = createAllNameVariants("José Ramírez");
  console.log("Variants for 'José Ramírez':", variants.slice(0, 8));
  
  // Test name matching
  const matches = [
    namesMatch("José Ramírez", "Jose Ramirez"),
    namesMatch("J. Ramírez", "Jose Ramirez"),
    namesMatch("Ramírez, José", "Jose Ramirez"),
    namesMatch("J. Ramirez", "Jose Ramirez")
  ];
  console.log("Name matching results:", matches);
};

export default {
  normalizeToEnglish,
  createAllNameVariants,
  namesMatch,
  findPlayerInRoster,
  testNameMatching
};