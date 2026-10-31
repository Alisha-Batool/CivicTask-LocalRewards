import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Clock, 
  Coins, 
  MapPin, 
  ArrowUpRight, 
  AlertCircle, 
  RefreshCw, 
  Check, 
  BrainCircuit, 
  Sliders, 
  CheckCircle2, 
  Compass,
  Tag
} from 'lucide-react';
import { apiFetch } from '../../lib/api-client.ts';
import { CivicTask, TaskCategory } from '../../lib/types.ts';

export interface CivicTaskAiMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: CivicTask[];
  onSelectTask: (task: CivicTask) => void;
  studentName?: string;
}

export interface MatchedTaskResult {
  taskId: string;
  taskTitle: string;
  category: string;
  rewardPoints: number;
  estimatedHours?: number;
  location?: string;
  matchScore: number;
  matchReason: string;
  keySkillOverlap: string[];
}

interface ApiResponse {
  success: boolean;
  model: string;
  student: {
    name: string;
    interests: string[];
    skills: string[];
    availableHoursPerWeek: number;
  };
  totalCandidatesEvaluated: number;
  matches: MatchedTaskResult[];
  summary: string;
}

const AVAILABLE_INTERESTS: TaskCategory[] = [
  'Environment',
  'Education',
  'Food Security',
  'Community Care',
  'Animal Welfare',
  'Civic Cleanup',
];

const AVAILABLE_SKILLS = [
  'Teaching',
  'Communication',
  'Gardening',
  'Cooking',
  'Organization',
  'Graphic Design',
  'Technical Skills',
  'Social Media',
  'Manual Work',
];

export function CivicTaskAiMatchModal({
  isOpen,
  onClose,
  tasks,
  onSelectTask,
  studentName,
}: CivicTaskAiMatchModalProps) {
  // Preferences State
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Environment', 'Food Security']);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['Gardening', 'Organization']);
  const [availableHours, setAvailableHours] = useState<number>(5);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  // Execution State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isServiceUnavailable, setIsServiceUnavailable] = useState<boolean>(false);
  const [setupCommand, setSetupCommand] = useState<string>('ollama run qwen2.5:3b-instruct');

  // Reset or close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest) 
        : [...prev, interest]
    );
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill) 
        : [...prev, skill]
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (selectedInterests.length === 0) {
      setErrorMessage('Please select at least one community interest.');
      return;
    }

    if (selectedSkills.length === 0) {
      setErrorMessage('Please select at least one skill to help match opportunities.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setIsServiceUnavailable(false);

    try {
      const response = await apiFetch<ApiResponse>('/api/ai/match-tasks', {
        method: 'POST',
        body: JSON.stringify({
          interests: selectedInterests,
          skills: selectedSkills,
          availableHoursPerWeek: Number(availableHours),
          additionalNotes: additionalNotes.trim() || undefined,
        }),
      });

      setResults(response);
    } catch (err: any) {
      const msg = err.message || 'Failed to match tasks';
      setErrorMessage(msg);
      if (msg.includes('503') || msg.toLowerCase().includes('ollama') || msg.toLowerCase().includes('unreachable')) {
        setIsServiceUnavailable(true);
        setSetupCommand('ollama run qwen2.5:3b-instruct');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 transition-all flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-match-title"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="ai-match-title" className="text-lg font-bold">CivicTask AI Match</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Qwen2.5-3B-Instruct
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Tailored civic task recommendations matched to your skills, interests, and schedule
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* If Results Exist, display Results View */}
          {results ? (
            <div className="space-y-6">
              {/* Summary Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                      AI Analysis Complete
                    </span>
                    <span className="text-xs text-emerald-700">
                      ({results.matches.length} matches from {results.totalCandidatesEvaluated} active tasks)
                    </span>
                  </div>
                  <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                    {results.summary}
                  </p>
                </div>

                <button
                  onClick={() => setResults(null)}
                  className="px-3 py-1.5 bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100 text-xs font-semibold rounded-xl transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Adjust Preferences</span>
                </button>
              </div>

              {/* Matches List */}
              {results.matches.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <Compass className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900">No Direct Task Matches Found</h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    None of the currently active community tasks fit your selected criteria. Try adding more skills or widening your weekly hour commitment.
                  </p>
                  <button
                    onClick={() => setResults(null)}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl"
                  >
                    Modify Search Parameters
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.matches.map((match) => {
                    // Match with real task record from Firestore
                    const liveTask = tasks.find(t => t.id === match.taskId);
                    const taskToUse: CivicTask = liveTask || {
                      id: match.taskId,
                      title: match.taskTitle,
                      category: match.category as any,
                      rewardPoints: match.rewardPoints,
                      estimatedHours: match.estimatedHours,
                      location: match.location,
                      description: match.matchReason,
                      status: 'active',
                      createdBy: 'system',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };

                    return (
                      <div
                        key={match.taskId}
                        className="p-5 bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl shadow-xs transition-all space-y-3 group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                {match.category}
                              </span>
                              {match.estimatedHours && (
                                <span className="text-xs text-slate-500 flex items-center gap-1 font-mono tabular-nums">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{match.estimatedHours} hrs</span>
                                </span>
                              )}
                              {match.location && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="truncate max-w-[150px]">{match.location}</span>
                                </span>
                              )}
                            </div>
                            <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                              {match.taskTitle}
                            </h4>
                          </div>

                          {/* Match Score Badge */}
                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <div className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-xs font-bold font-mono tracking-tight flex items-center gap-1 shadow-xs">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                              <span>{match.matchScore}% Match</span>
                            </div>
                            <div className="flex items-center gap-1 font-bold text-emerald-800 text-sm font-mono tabular-nums pl-1">
                              <Coins className="w-4 h-4 text-emerald-700" />
                              <span>+{match.rewardPoints} pts</span>
                            </div>
                          </div>
                        </div>

                        {/* AI Match Reason Rationale */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            <BrainCircuit className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Why Qwen AI Recommends This:</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed italic">
                            "{match.matchReason}"
                          </p>

                          {/* Skill Overlaps */}
                          {match.keySkillOverlap && match.keySkillOverlap.length > 0 && (
                            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                              <span className="text-[11px] font-semibold text-slate-500">Skill overlap:</span>
                              {match.keySkillOverlap.map((skill) => (
                                <span
                                  key={skill}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100/80 text-emerald-900 border border-emerald-200"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                          <span className="text-[11px] text-slate-500 font-mono">
                            Task ID: {match.taskId.slice(0, 14)}...
                          </span>

                          <button
                            onClick={() => {
                              onSelectTask(taskToUse);
                              onClose();
                            }}
                            className="min-h-[38px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <span>Open Task &amp; Submit Proof</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Preferences Form View */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Community Interests */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  1. Community Causes &amp; Interests (Select all that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_INTERESTS.map((interest) => {
                    const isSelected = selectedInterests.includes(interest);
                    return (
                      <button
                        type="button"
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-800 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                        <span>{interest}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Skills */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  2. Your Skills &amp; Capabilities
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SKILLS.map((skill) => {
                    const isSelected = selectedSkills.includes(skill);
                    return (
                      <button
                        type="button"
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        <span>{skill}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Weekly Availability */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label htmlFor="availability-slider" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    3. Weekly Volunteer Availability
                  </label>
                  <span className="text-sm font-bold font-mono text-emerald-800 tabular-nums">
                    {availableHours} {availableHours === 1 ? 'hour' : 'hours'} / week
                  </span>
                </div>
                <input
                  id="availability-slider"
                  type="range"
                  min="1"
                  max="40"
                  value={availableHours}
                  onChange={(e) => setAvailableHours(Number(e.target.value))}
                  className="w-full accent-emerald-700 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>1 hr/wk</span>
                  <span>10 hrs/wk</span>
                  <span>20 hrs/wk</span>
                  <span>40 hrs/wk</span>
                </div>
              </div>

              {/* Step 4: Additional Notes / Preferences */}
              <div className="space-y-1.5">
                <label htmlFor="additional-notes" className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  4. Additional Preferences (Optional)
                </label>
                <textarea
                  id="additional-notes"
                  rows={2}
                  maxLength={500}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="e.g., Prefer outdoor tasks on weekend mornings, flexible scheduling, close to campus..."
                  className="w-full p-3 bg-white text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent placeholder:text-slate-400"
                />
                <span className="text-[10px] text-slate-500 block text-right font-mono">
                  {additionalNotes.length}/500
                </span>
              </div>

              {/* Error Banner / 503 State */}
              {errorMessage && (
                <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <h4 className="text-xs font-bold">
                        {isServiceUnavailable ? 'Ollama AI Service Offline (HTTP 503)' : 'Recommendation Error'}
                      </h4>
                      <p className="text-xs text-rose-800 leading-relaxed">
                        {errorMessage}
                      </p>
                    </div>
                  </div>

                  {isServiceUnavailable && (
                    <div className="p-3 bg-white rounded-xl border border-rose-200 text-xs space-y-1 font-mono">
                      <div className="text-[11px] text-slate-600 font-sans font-semibold">
                        To activate real open-weight inference, start Ollama locally:
                      </div>
                      <code className="text-emerald-800 bg-slate-100 px-2 py-1 rounded block select-all">
                        {setupCommand}
                      </code>
                      <p className="text-[11px] text-slate-500 font-sans pt-1">
                        CivicTask strictly uses authentic local open-weight inference (no fake mocks or proprietary substitutes).
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleSubmit()}
                      className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry Request</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 px-6 rounded-2xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                    isLoading 
                      ? 'bg-slate-700 cursor-not-allowed opacity-80' 
                      : 'bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 hover:from-emerald-800 hover:to-teal-950 hover:shadow-lg'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                      <span>Qwen2.5-3B-Instruct is analyzing {tasks.length} active opportunities...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-300" />
                      <span>Find My AI Matches</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Real Open-Weight Inference &middot; Zero Simulated Responses</span>
          </div>

          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-medium px-2 py-1"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
