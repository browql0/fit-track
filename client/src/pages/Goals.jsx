import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, CheckCircle2, ChevronRight,
  Droplets, Dumbbell, Flame, MoveRight, Salad, Scale,
  Sparkles, Target, TrendingDown, TrendingUp, Trophy, Zap, X
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { profileService } from '../services/profileService';
import { fetchGoalsData, queryKeys } from '../services/queryClient';
import './Goals.css';

const pct = (v, m) => (m ? Math.min(100, Math.round((Number(v || 0) / m) * 100)) : 0);

const GOAL_LABELS = {
  fat_loss: 'Perte de gras',
  weight_loss: 'Perte de poids',
  maintenance: 'Maintien',
  muscle_gain: 'Prise de muscle',
  bulking: 'Prise de masse',
};

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const Goals = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const goalsQuery = useQuery({
    queryKey: queryKeys.goals,
    queryFn: fetchGoalsData,
  });
  const data = goalsQuery.data || {
    profile: null,
    targets: null,
    summary: null,
    coach: null,
    coachHistory: [],
    weights: [],
    goalSnapshot: null,
    hydration: null,
    weekWorkouts: [],
  };
  const error = goalsQuery.error ? 'Impossible de charger les objectifs.' : '';

  const targetWeightMutation = useMutation({
    mutationFn: (newTarget) => {
      if (!data.profile) throw new Error('Profil manquant');
      return profileService.updateProfile({ ...data.profile, targetWeightKg: newTarget });
    },
    onSuccess: (_result, newTarget) => {
      queryClient.setQueryData(queryKeys.goals, (current) => ({
        ...current,
        targets: { ...(current?.targets || {}), targetWeightKg: newTarget },
        profile: current?.profile ? { ...current.profile, targetWeightKg: newTarget } : current?.profile,
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.goals });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.coach });
      setIsModalOpen(false);
    },
  });

  /* ─── Chart data (score evolution) ─── */
  const chartData = useMemo(() => {
    const pts = (data.coachHistory || []).map((s) => ({
      date: new Date(s.snapshotDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      score: s.score,
    }));
    
    if (pts.length >= 2) return pts;
    
    // Si l'utilisateur n'a qu'un seul point d'historique, on rajoute un point de départ factice 
    // pour qu'une ligne soit tracée plutôt qu'un point isolé.
    if (pts.length === 1) {
      return [
        { date: 'Début', score: 0 },
        pts[0]
      ];
    }
    
    // Sinon, données de présentation (fallback)
    return [{ date: 'J-7', score: 62 }, { date: 'J-3', score: 71 }, { date: 'Auj', score: data.coach?.score || 0 }];
  }, [data.coachHistory, data.coach?.score]);

  /* ─── Weekly workout map ─── */
  const weekMap = useMemo(() => {
    const map = {};
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + mondayOffset + i);
      const key = d.toISOString().split('T')[0];
      map[i] = { date: key, label: DAY_LABELS[i], isToday: key === now.toISOString().split('T')[0], mins: 0, done: false };
    }

    const workouts = Array.isArray(data.weekWorkouts) ? data.weekWorkouts : [];
    workouts.forEach((w) => {
      const wDate = (w.workoutDate || w.date || '').slice(0, 10);
      for (const idx of Object.keys(map)) {
        if (map[idx].date === wDate) {
          map[idx].mins += Number(w.durationMinutes || 0);
          map[idx].done = true;
        }
      }
    });

    return Object.values(map);
  }, [data.weekWorkouts]);

  const workoutDaysThisWeek = weekMap.filter((d) => d.done).length;

  /* ─── Handle Target Weight Update ─── */
  const handleUpdateTargetWeight = async (newTarget) => {
    try {
      await targetWeightMutation.mutateAsync(newTarget);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la mise à jour du poids cible');
    }
  };

  /* ─── Loading ─── */
  if (goalsQuery.isLoading && !goalsQuery.data) {
    return (
      <div className="gl-shell">
        <div className="gl-skeleton" style={{ height: 64 }} />
        <div className="gl-skeleton" style={{ height: 280, marginTop: 16 }} />
        <div className="gl-skeleton" style={{ height: 200, marginTop: 16 }} />
      </div>
    );
  }

  const { profile, targets, summary, coach, weights, hydration } = data;
  const score = coach?.score || 0;
  const streaks = coach?.streaks || {};
  const premium = coach?.premium || {};
  const insights = coach?.insights || [];
  const predictions = coach?.predictions || [];
  const priorities = premium.currentPriorities || [];
  const alerts = premium.importantAlerts || [];

  /* ─── Macro calculations ─── */
  const calTarget = Number(targets?.targetCalories || 2200);
  const protTarget = Number(targets?.targetProtein || 145);
  const carbTarget = Number(targets?.targetCarbs || 240);
  const fatTarget = Number(targets?.targetFat || 72);

  const calPct = pct(summary?.calories, calTarget);
  const protPct = pct(summary?.protein, protTarget);
  const carbPct = pct(summary?.carbs, carbTarget);
  const fatPct = pct(summary?.fat, fatTarget);

  /* ─── Weight data ─── */
  const currentWeight = weights?.[0]?.weightKg || profile?.weightKg || null;
  const targetWeight = profile?.targetWeightKg || targets?.targetWeightKg || null;
  const startWeight = profile?.weightKg || null;

  const weightProgress = (() => {
    if (!startWeight || !targetWeight || !currentWeight) return 0;
    const total = Math.abs(startWeight - targetWeight);
    if (total === 0) return 100;
    const done = Math.abs(startWeight - currentWeight);
    return Math.min(100, Math.round((done / total) * 100));
  })();

  const weightDiff = currentWeight && targetWeight ? (currentWeight - targetWeight).toFixed(1) : null;
  const isGaining = profile?.goal === 'muscle_gain' || profile?.goal === 'bulking';

  /* ─── Hydration ─── */
  const hydrationMl = hydration?.totalMl || hydration?.total || 0;
  const hydrationTarget = 2500;
  const hydrationPct = pct(hydrationMl, hydrationTarget);
  const glassCount = Math.floor(hydrationMl / 250);

  /* ─── SVG ring ─── */
  const R = 42, C = 2 * Math.PI * R;

  return (
    <motion.div 
      className="gl-shell"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ══════ HEADER ══════ */}
      <header className="gl-head">
        <div className="gl-head__left">
          <p className="gl-head__sub">Mes objectifs</p>
          <h1>Tableau de bord</h1>
        </div>
        {profile?.goal && (
          <span className="gl-head__badge">
            <Target size={13} />
            {GOAL_LABELS[profile.goal] || profile.goal}
          </span>
        )}
      </header>

      {error && <div className="gl-error">{error}</div>}
      {goalsQuery.isFetching && goalsQuery.data && <div className="status-chip" style={{ marginBottom: 12 }}>Refresh...</div>}

      {/* ══════ HERO CARD ══════ */}
      <motion.section className="gl-hero" whileHover={{ scale: 1.01 }}>
        <div className="gl-hero__bg" />
        <div className="gl-hero__mesh" />

        <div className="gl-hero__content">
          <div className="gl-hero__ring-box">
            <svg viewBox="0 0 100 100" className="gl-hero__svg">
              <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
              <motion.circle cx="50" cy="50" r={R} fill="none"
                stroke="url(#glScoreGrad)" strokeWidth="5.5" strokeLinecap="round"
                strokeDasharray={C} 
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: C - (score / 100) * C }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="gl-hero__arc"
                transform="rotate(-90 50 50)" />
              <defs>
                <linearGradient id="glScoreGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--aqua)" />
                  <stop offset="100%" stopColor="var(--lime)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="gl-hero__num">
              <span>{score}</span>
              <small>FitScore</small>
            </div>
          </div>

          <div className="gl-hero__meta">
            <h2>{coach?.summary?.title || 'Analyse en cours'}</h2>
            <p className="gl-hero__msg">
              {coach?.summary?.message || 'Continuez à tracker vos repas et entraînements pour obtenir des recommandations personnalisées.'}
            </p>
          </div>
        </div>

        {/* Quick pillars */}
        <div className="gl-hero__pills">
          <div className="gl-pill">
            <span className="gl-pill__icon green"><Salad size={16} /></span>
            <div className="gl-pill__info">
              <strong>{coach?.nutrition || 0}<small>/100</small></strong>
              <span>Nutrition</span>
            </div>
          </div>
          <div className="gl-pill">
            <span className="gl-pill__icon cyan"><Dumbbell size={16} /></span>
            <div className="gl-pill__info">
              <strong>{coach?.training || 0}<small>/100</small></strong>
              <span>Entraînement</span>
            </div>
          </div>
          <div className="gl-pill">
            <span className="gl-pill__icon amber"><Flame size={16} /></span>
            <div className="gl-pill__info">
              <strong>{coach?.consistency || 0}<small>/100</small></strong>
              <span>Constance</span>
            </div>
          </div>
        </div>
      </motion.section>


      {/* ══════ NUTRITION TARGETS ══════ */}
      <section className="gl-section" style={{ '--gl-delay': '160ms' }}>
        <div className="gl-section__head">
          <h2 className="gl-section__title">Objectifs Nutrition</h2>
          <span className="gl-section__sub">{summary?.calories || 0} / {calTarget} kcal</span>
        </div>

        <div className="gl-macros">
          <MacroBar
            label="Calories" icon={<Flame size={15} />} color="green"
            current={summary?.calories || 0} target={calTarget} unit="kcal"
            pct={calPct} delay="0ms"
          />
          <MacroBar
            label="Protéines" icon={<Zap size={15} />} color="cyan"
            current={summary?.protein || 0} target={protTarget} unit="g"
            pct={protPct} delay="60ms"
          />
          <MacroBar
            label="Glucides" icon={<Sparkles size={15} />} color="violet"
            current={summary?.carbs || 0} target={carbTarget} unit="g"
            pct={carbPct} delay="120ms"
          />
          <MacroBar
            label="Lipides" icon={<Droplets size={15} />} color="amber"
            current={summary?.fat || 0} target={fatTarget} unit="g"
            pct={fatPct} delay="180ms"
          />
        </div>
      </section>


      {/* ══════ TWO-COLUMN: WEIGHT + WORKOUT ══════ */}
      <div className="gl-grid-2" style={{ marginTop: 28 }}>

        {/* ─── Weight Goal ─── */}
        <section className="gl-section" style={{ '--gl-delay': '240ms', marginTop: 0 }}>
          <div className="gl-section__head">
            <h2 className="gl-section__title">Objectif Poids</h2>
            <span className="gl-section__sub">{weightProgress}%</span>
          </div>

          <div className="gl-weight">
            {targetWeight ? (
              <>
                <div className="gl-weight__top">
                  <div className="gl-weight__vals">
                    <div className="gl-weight__val">
                      <strong>{currentWeight || '--'}</strong>
                      <small>Actuel (kg)</small>
                    </div>
                    <div className="gl-weight__arrow"><MoveRight size={20} /></div>
                    <div className="gl-weight__val">
                      <strong>{targetWeight}</strong>
                      <small>Objectif (kg)</small>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="gl-head__badge"
                    style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', padding: '4px 8px' }}
                  >
                    Modifier
                  </button>
                </div>

                <div className="gl-weight__track-wrap">
                  <div className="gl-weight__labels">
                    <span>{startWeight ? `${startWeight} kg` : '--'}</span>
                    <span>{targetWeight} kg</span>
                  </div>
                  <div className="gl-weight__track">
                    <div className="gl-weight__fill" style={{ width: `${weightProgress}%` }} />
                    {currentWeight && (
                      <div className="gl-weight__marker" style={{ left: `${weightProgress}%` }} />
                    )}
                  </div>
                </div>

                {weightDiff !== null && (
                  <div className="gl-weight__diff">
                    {Number(weightDiff) === 0 ? (
                      <><CheckCircle2 size={14} className="neutral" /> <span className="neutral">Objectif atteint !</span></>
                    ) : Number(weightDiff) > 0 && !isGaining ? (
                      <><TrendingDown size={14} className="positive" /> <span className="positive">Encore {Math.abs(weightDiff)} kg à perdre</span></>
                    ) : Number(weightDiff) < 0 && isGaining ? (
                      <><TrendingUp size={14} className="positive" /> <span className="positive">Encore {Math.abs(weightDiff)} kg à gagner</span></>
                    ) : (
                      <><CheckCircle2 size={14} className="positive" /> <span className="positive">{isGaining ? `+${Math.abs(weightDiff)} kg gagnés` : `-${Math.abs(weightDiff)} kg perdus`}</span></>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="gl-empty" style={{ margin: 0, padding: '24px 16px', border: 'none', background: 'transparent' }}>
                <Target size={24} style={{ margin: '0 auto 12px', color: 'rgba(255,255,255,0.2)' }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Aucun objectif de poids défini.</p>
                <button 
                  className="gl-head__badge" 
                  style={{ marginTop: 16, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  onClick={() => setIsModalOpen(true)}
                >
                  Définir un objectif
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ─── Workout Goal ─── */}
        <section className="gl-section" style={{ '--gl-delay': '300ms', marginTop: 0 }}>
          <div className="gl-section__head">
            <h2 className="gl-section__title">Entraînements Semaine</h2>
            <span className="gl-section__sub">{workoutDaysThisWeek}/7 jours</span>
          </div>

          <div className="gl-workout-grid">
            {weekMap.map((day) => (
              <div
                key={day.date}
                className={`gl-day ${day.done ? 'gl-day--done' : ''} ${day.isToday ? 'gl-day--today' : ''}`}
              >
                <span className="gl-day__label">{day.label}</span>
                <span className="gl-day__dot">
                  {day.done ? <CheckCircle2 size={14} /> : <span style={{ width: 14, height: 14 }} />}
                </span>
                <span className="gl-day__mins">{day.mins > 0 ? `${day.mins}m` : '—'}</span>
              </div>
            ))}
          </div>
        </section>
      </div>


      {/* ══════ HYDRATION ══════ */}
      <section className="gl-section" style={{ '--gl-delay': '360ms' }}>
        <div className="gl-section__head">
          <h2 className="gl-section__title">Hydratation</h2>
          <span className="gl-section__sub">{hydrationPct}%</span>
        </div>

        <div className="gl-hydration">
          <div className="gl-hydration__top">
            <span className="gl-hydration__label">
              <Droplets size={16} color="#22d3ee" />
              Eau du jour
            </span>
            <span className="gl-hydration__val">
              {(hydrationMl / 1000).toFixed(1)}<small> / {(hydrationTarget / 1000).toFixed(1)} L</small>
            </span>
          </div>
          <div className="gl-hydration__bar">
            <div className="gl-hydration__fill" style={{ width: `${hydrationPct}%` }} />
          </div>
          <div className="gl-hydration__glasses">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className={`gl-glass ${i < glassCount ? 'gl-glass--filled' : ''}`} />
            ))}
          </div>
        </div>
      </section>


      {/* ══════ STREAKS ══════ */}
      {(streaks.global > 0 || streaks.protein > 0 || streaks.training > 0 || streaks.weight > 0) && (
        <section className="gl-section" style={{ '--gl-delay': '420ms' }}>
          <div className="gl-section__head">
            <h2 className="gl-section__title">Séries en cours</h2>
          </div>

          <div className="gl-streaks">
            <StreakCard icon={Flame} label="Tracking" value={streaks.global || 0} color="#f59e0b" delay="0ms" />
            <StreakCard icon={Salad} label="Protéines" value={streaks.protein || 0} color="#22d3ee" delay="60ms" />
            <StreakCard icon={Dumbbell} label="Entraînement" value={streaks.training || 0} color="#a78bfa" delay="120ms" />
            <StreakCard icon={Scale} label="Pesée" value={streaks.weight || 0} color="#f43f5e" delay="180ms" />
          </div>
        </section>
      )}


      {/* ══════ SCORE EVOLUTION CHART ══════ */}
      <motion.section 
        className="gl-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="gl-section__head">
          <h2 className="gl-section__title">Évolution FitScore</h2>
          <span className="gl-section__sub">30 jours</span>
        </div>

        <div className="gl-weight" style={{ padding: '20px' }}>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="glScoreFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#00E5FF" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'rgba(8,10,18,0.96)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', fontSize: '0.82rem' }} />
                <Area type="monotone" dataKey="score" stroke="#00E5FF" strokeWidth={3} fill="url(#glScoreFill)" dot={{ fill: '#00E5FF', r: 3, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#00E5FF', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.section>


      {/* ══════ PRIORITIES ══════ */}
      {priorities.length > 0 && (
        <section className="gl-section" style={{ '--gl-delay': '540ms' }}>
          <div className="gl-section__head">
            <h2 className="gl-section__title">Priorités du moment</h2>
            <span className="gl-section__sub">{priorities.length} actions</span>
          </div>

          <div className="gl-priorities">
            {priorities.map((p, i) => (
              <div className="gl-priority" key={`${p.title}-${i}`} style={{ '--mi-d': `${i * 60}ms` }}>
                <span className="gl-priority__num">{i + 1}</span>
                <div className="gl-priority__body">
                  <strong>{p.title}</strong>
                  <small>{p.detail}</small>
                </div>
                <span className="gl-priority__status"><ChevronRight size={16} /></span>
              </div>
            ))}
          </div>
        </section>
      )}


      {/* ══════ ALERTS ══════ */}
      {alerts.length > 0 && (
        <section className="gl-section" style={{ '--gl-delay': '600ms' }}>
          <div className="gl-section__head">
            <h2 className="gl-section__title">Alertes</h2>
          </div>

          <div className="gl-insights">
            {alerts.map((a, i) => (
              <div className="gl-insight" key={`${a.title}-${i}`} style={{ '--insight-color': '#f59e0b', '--mi-d': `${i * 60}ms` }}>
                <span className="gl-insight__tag"><AlertTriangle size={12} /> {a.title}</span>
                <p className="gl-insight__msg">{a.message} {a.action}</p>
              </div>
            ))}
          </div>
        </section>
      )}


      {/* ══════ INSIGHTS / PREDICTIONS ══════ */}
      {(insights.length > 0 || predictions.length > 0) && (
        <section className="gl-section" style={{ '--gl-delay': '660ms' }}>
          <div className="gl-section__head">
            <h2 className="gl-section__title">Insights & Prédictions</h2>
          </div>

          <div className="gl-insights">
            {predictions.map((p, i) => (
              <div className="gl-insight" key={`pred-${i}`} style={{ '--insight-color': '#10b981', '--mi-d': `${i * 60}ms` }}>
                <span className="gl-insight__tag"><TrendingUp size={12} /> Prédiction</span>
                <p className="gl-insight__msg">{p.message}</p>
              </div>
            ))}
            {insights.map((ins, i) => (
              <div className="gl-insight" key={`ins-${i}`} style={{ '--insight-color': '#22d3ee', '--mi-d': `${(predictions.length + i) * 60}ms` }}>
                <span className="gl-insight__tag"><Zap size={12} /> {ins.title || 'Conseil'}</span>
                <p className="gl-insight__msg">{ins.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}


      {/* ══════ RÉSUMÉS (Jour / Semaine / Mois) ══════ */}
      {(premium.dailySummary || premium.weeklySummary || premium.monthlySummary) && (
        <section className="gl-section" style={{ '--gl-delay': '720ms' }}>
          <div className="gl-section__head">
            <h2 className="gl-section__title">Résumés Coach</h2>
          </div>

          <div className="gl-insights">
            {premium.dailySummary?.message && (
              <div className="gl-insight" style={{ '--insight-color': '#22d3ee', '--mi-d': '0ms' }}>
                <span className="gl-insight__tag"><Sparkles size={12} /> Aujourd'hui</span>
                <p className="gl-insight__msg">{premium.dailySummary.message}</p>
              </div>
            )}
            {premium.weeklySummary?.message && (
              <div className="gl-insight" style={{ '--insight-color': '#a78bfa', '--mi-d': '60ms' }}>
                <span className="gl-insight__tag"><Target size={12} /> Semaine</span>
                <p className="gl-insight__msg">{premium.weeklySummary.message}</p>
              </div>
            )}
            {premium.monthlySummary?.message && (
              <div className="gl-insight" style={{ '--insight-color': '#f59e0b', '--mi-d': '120ms' }}>
                <span className="gl-insight__tag"><Trophy size={12} /> Mois</span>
                <p className="gl-insight__msg">{premium.monthlySummary.message}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══════ POURQUOI CE SCORE ══════ */}
      {(coach?.reasons?.length > 0) && (
        <section className="gl-section" style={{ '--gl-delay': '780ms' }}>
          <div className="gl-section__head">
            <h2 className="gl-section__title">Pourquoi ce score</h2>
          </div>

          <div className="gl-priorities">
            {coach.reasons.map((reason, i) => (
              <div className="gl-priority" key={`reason-${i}`} style={{ '--mi-d': `${i * 40}ms` }}>
                <span className="gl-priority__num" style={{ background: 'linear-gradient(135deg, var(--lime), #6ee7b7)' }}>
                  <CheckCircle2 size={16} />
                </span>
                <div className="gl-priority__body">
                  <strong>{reason}</strong>
                </div>
                <span className="gl-priority__status"><CheckCircle2 size={16} color="var(--lime)" /></span>
              </div>
            ))}
          </div>
        </section>
      )}
      {isModalOpen && (
        <WeightGoalModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleUpdateTargetWeight} 
          profile={data.profile} 
          currentWeight={currentWeight} 
        />
      )}
    </motion.div>
  );
};

const WeightGoalModal = ({ onClose, onSave, profile, currentWeight }) => {
  const heightM = (profile?.heightCm || 170) / 100;
  const weight = currentWeight || profile?.weightKg || 70;
  const imc = weight / (heightM * heightM);
  
  const [customVal, setCustomVal] = useState(weight);
  
  const options = [
    { label: 'Perte Légère', val: Math.round((weight - 2) * 10) / 10, desc: 'Idéal pour s\'affiner en douceur', icon: <TrendingDown size={16} /> },
    { label: 'Perte Active', val: Math.round((weight - 5) * 10) / 10, desc: 'Objectif de transformation', icon: <TrendingDown size={16} /> },
    { label: 'Maintien', val: weight, desc: 'Garder son poids actuel', icon: <CheckCircle2 size={16} /> },
    { label: 'Prise de Masse', val: Math.round((weight + 3) * 10) / 10, desc: 'Développement musculaire', icon: <TrendingUp size={16} /> },
  ];

  return createPortal(
    <div className="gl-modal-overlay" onClick={onClose}>
      <div className="gl-modal" onClick={e => e.stopPropagation()}>
        <div className="gl-modal__head">
          <h3>Objectif de Poids</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="gl-modal__body">
          <div className="gl-modal__imc">
            <strong>IMC Actuel : {imc.toFixed(1)}</strong>
            <span>
              {imc < 18.5 ? 'Insuffisance pondérale' : 
               imc < 25 ? 'Corpulence normale' : 
               imc < 30 ? 'Surpoids' : 'Obésité'}
            </span>
          </div>
          
          <div className="gl-modal__options">
            {options.map((opt, i) => (
              <button key={i} className="gl-modal__opt" onClick={() => onSave(opt.val)}>
                <div className="gl-modal__opt-icon">{opt.icon}</div>
                <div className="gl-modal__opt-info">
                  <strong>{opt.label}</strong>
                  <small>{opt.desc}</small>
                </div>
                <div className="gl-modal__opt-val">{opt.val} kg</div>
              </button>
            ))}
          </div>

          <div className="gl-modal__custom">
            <label>Poids personnalisé</label>
            <div className="gl-modal__input-group">
              <input 
                type="number" 
                step="0.1" 
                value={customVal} 
                onChange={e => setCustomVal(e.target.value)} 
              />
              <span>kg</span>
              <button onClick={() => onSave(Number(customVal))}>Valider</button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};


/* ─── Sub-components ─── */

const MacroBar = ({ label, icon, color, current, target, unit, pct: percent, delay }) => (
  <div className="gl-macro" style={{ '--mi-d': delay }}>
    <div className="gl-macro__head">
      <div className="gl-macro__left">
        <span className={`gl-macro__icon gl-pill__icon ${color}`}>{icon}</span>
        <span className="gl-macro__name">{label}</span>
      </div>
      <span className="gl-macro__values">
        <strong>{current}</strong> / {target} {unit}
      </span>
    </div>
    <div className="gl-macro__track">
      <motion.div 
        className={`gl-macro__fill ${color}`} 
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 1, ease: "easeOut", delay: parseFloat(delay) / 1000 }}
      />
    </div>
    <span className="gl-macro__pct">{percent}%</span>
  </div>
);

const StreakCard = ({ icon: Icon, label, value, color, delay }) => {
  const active = value > 0;
  return (
    <div className={`gl-streak ${active ? 'gl-streak--active' : ''}`} style={{ '--streak-color': color, '--mi-d': delay }}>
      <span className="gl-streak__icon"><Icon size={18} strokeWidth={2.4} /></span>
      <div className="gl-streak__info">
        <strong>{value}<small>j</small></strong>
        <span>{label}</span>
      </div>
      {active && <div className="gl-streak__glow" />}
    </div>
  );
};
