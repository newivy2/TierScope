import { ANALYSIS_PREFERENCE_KEY, DEFAULT_ANALYSIS_PREFERENCES, validateAnalysisPreferences } from './analysis-preference-data.js';

let analysisPreferences = DEFAULT_ANALYSIS_PREFERENCES;
let analysisPreferencesPending = false;
let analysisPreferencesError = '';

export function readAnalysisPreferences() {
    if (!analysisPreferencesPending) {
        try {
            const raw = GM_getValue(ANALYSIS_PREFERENCE_KEY, null);
            analysisPreferences = raw === null ? DEFAULT_ANALYSIS_PREFERENCES : validateAnalysisPreferences(JSON.parse(raw));
            analysisPreferencesError = '';
        } catch (error) { analysisPreferencesError = 'Saved analysis preferences could not be read. Using the choices available in this tab.'; }
    }
    return {preferences: analysisPreferences, error: analysisPreferencesError};
}

export function rememberAnalysisPreferences(patch) {
    // Merge only the changed choice with the latest saved choices from other tabs.
    const current = readAnalysisPreferences().preferences;
    analysisPreferences = validateAnalysisPreferences({...current, ...patch});
    analysisPreferencesPending = true;
    try {
        GM_setValue(ANALYSIS_PREFERENCE_KEY, JSON.stringify(analysisPreferences));
        analysisPreferencesPending = false;
        analysisPreferencesError = '';
    } catch (error) { analysisPreferencesError = 'Analysis choices are kept in this tab only. Saving will retry when you change a choice.'; }
    return {preferences: analysisPreferences, error: analysisPreferencesError};
}
