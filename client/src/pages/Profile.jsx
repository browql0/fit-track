import { useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, ChevronRight, Settings, LogOut, Moon, Sun,
  Ruler, Target, Activity, Shield, Download, Trash2, X,
  Check, AlertTriangle, Scale, Heart,
  Clock, Edit3, Mail, Lock
} from 'lucide-react';
import { AuthContext } from '../context/authContext';
import { ThemeContext } from '../context/themeContext';
import { profileService } from '../services/profileService';
import { weightService } from '../services/weightService';
import { Select } from '../components/ui/Input';

import { queryKeys } from '../services/queryClient';
import { ACTIVITY_LEVEL_LABELS, GOAL_LABELS } from '../utils/constants';
import './Profile.css';

/* ────── helpers ────── */
const bmi = (h, w) => {
  if (!h || !w) return null;
  return (w / ((h / 100) ** 2)).toFixed(1);
};
const bmiLabel = (v) => {
  if (!v) return '';
  if (v < 18.5) return 'Insuffisant';
  if (v < 25) return 'Normal';
  if (v < 30) return 'Surpoids';
  return 'Obésité';
};
export const Profile = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /* ─── profile data ─── */
  const profileQuery = useQuery({
    queryKey: queryKeys.profile,
    queryFn: profileService.getProfile,
  });

  const weightQuery = useQuery({
    queryKey: queryKeys.weight,
    queryFn: () => weightService.getWeightEntries(7),
  });

  const profile = profileQuery.data?.profile || null;
  const targets = profileQuery.data?.targets || null;
  const weights = weightQuery.data || [];
  const latestWeight = weights[0]?.weightKg || profile?.weightKg || null;

  /* ─── modals ─── */
  const [activeModal, setActiveModal] = useState(null);
  const [toast, setToast] = useState(null);

  /* ─── edit profile form ─── */
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  /* ─── password form ─── */


  /* ─── export loading ─── */
  const [exportLoading, setExportLoading] = useState(false);

  /* ─── confirm delete ─── */
  const [confirmText, setConfirmText] = useState('');

  const openEditModal = () => {
    if (profile) {
      setEditForm({
        name: profile.name || '',
        age: profile.age || '',
        gender: profile.gender || 'male',
        heightCm: profile.heightCm || '',
        weightKg: profile.weightKg || '',
        targetWeightKg: profile.targetWeightKg || '',
        activityLevel: profile.activityLevel || 'sedentary',
        goal: profile.goal || 'maintenance',
      });
    }
    setActiveModal('edit');
  };

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ────── handlers ────── */
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const payload = {
        ...editForm,
        age: Number(editForm.age),
        heightCm: Number(editForm.heightCm),
        weightKg: Number(editForm.weightKg),
        targetWeightKg: editForm.targetWeightKg ? Number(editForm.targetWeightKg) : null,
      };
      await profileService.updateProfile(payload);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.goals });
      queryClient.invalidateQueries({ queryKey: queryKeys.coach });
      setActiveModal(null);
      showToast('success', 'Profil mis à jour avec succès');
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Erreur lors de la mise à jour');
    } finally {
      setEditLoading(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      // Gather all data
      const [profileData, weightData] = await Promise.all([
        profileService.getProfile().catch(() => null),
        weightService.getWeightEntries(365).catch(() => []),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        user: { email: user?.email },
        profile: profileData?.profile || null,
        targets: profileData?.targets || null,
        weightHistory: weightData,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fittrack-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setActiveModal(null);
      showToast('success', 'Données exportées avec succès');
    } catch {
      showToast('error', 'Erreur lors de l\'export');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Only logout since delete endpoint doesn't exist
    showToast('error', 'Contactez le support pour supprimer votre compte.');
    setActiveModal(null);
  };

  /* ────── computed values ────── */
  const userName = profile?.name || user?.email?.split('@')[0] || 'Athlète';
  const userInitial = userName[0]?.toUpperCase() || 'A';
  const myBmi = bmi(profile?.heightCm, latestWeight);
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Membre actif';

  const bodyCards = [
    { label: 'Taille', value: profile?.heightCm, unit: 'cm', icon: Ruler, color: 'cyan' },
    { label: 'Poids actuel', value: latestWeight, unit: 'kg', icon: Scale, color: 'lime' },
    { label: 'Poids cible', value: profile?.targetWeightKg, unit: 'kg', icon: Target, color: 'violet' },
    { label: 'IMC', value: myBmi, unit: bmiLabel(myBmi), icon: Heart, color: myBmi && myBmi < 25 ? 'green' : myBmi && myBmi < 30 ? 'amber' : 'coral' },
    { label: 'Âge', value: profile?.age, unit: 'ans', icon: Clock, color: 'amber' },
    { label: 'Activité', value: ACTIVITY_LEVEL_LABELS[profile?.activityLevel]?.split(' ')[0], unit: '', icon: Activity, color: 'coral' },
  ];

  const statsBar = [
    { label: 'Calories', value: targets?.targetCalories || '—', unit: 'kcal' },
    { label: 'Protéines', value: targets?.targetProtein || '—', unit: 'g' },
    { label: 'Glucides', value: targets?.targetCarbs || '—', unit: 'g' },
    { label: 'Lipides', value: targets?.targetFat || '—', unit: 'g' },
  ];

  /* ────── loading state ────── */
  if (profileQuery.isLoading && !profileQuery.data) {
    return (
      <div className="pf-shell">
        <div className="skeleton" style={{ height: 200, borderRadius: 28 }} />
        <div className="skeleton" style={{ height: 120, borderRadius: 22, marginTop: 24 }} />
        <div className="skeleton" style={{ height: 260, borderRadius: 22, marginTop: 24 }} />
      </div>
    );
  }

  return (
    <div className="pf-shell">
      {(profileQuery.isFetching || weightQuery.isFetching) && (profileQuery.data || weightQuery.data) && (
        <div className="status-chip" style={{ marginBottom: 12 }}>Refresh...</div>
      )}

      {/* ═══ TOAST ═══ */}
      {toast && (
        <div className={`pf-toast pf-toast--${toast.type}`}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <header className="pf-head">
        <div>
          <p className="pf-head__sub">Mon Profil</p>
          <h1 className="pf-head__title">{userName}</h1>
        </div>
        <div className="pf-head__actions">
          <button className="pf-head__btn" onClick={openEditModal} aria-label="Modifier">
            <Edit3 size={18} />
          </button>
        </div>
      </header>

      {/* ═══ HERO CARD ═══ */}
      <section className="pf-hero">
        <div className="pf-hero__bg" />
        <div className="pf-hero__mesh" />

        <div className="pf-hero__top">
          <div className="pf-hero__avatar">{userInitial}</div>
          <div className="pf-hero__info">
            <span className="pf-hero__badge">
              <Sparkles size={12} />
              FitTrack Premium
            </span>
            <h2 className="pf-hero__name">{userName}</h2>
            <p className="pf-hero__email">{user?.email || 'Session active'}</p>
          </div>
        </div>

        {/* Macro targets strip */}
        <div className="pf-hero__stats">
          {statsBar.map((s, i) => (
            <div className="pf-stat" key={s.label} style={{ '--stat-d': `${i * 80}ms` }}>
              <span className="pf-stat__value">{s.value}<small> {s.unit}</small></span>
              <span className="pf-stat__label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ BODY METRICS ═══ */}
      <section className="pf-section" style={{ '--sec-d': '160ms' }}>
        <div className="pf-section__head">
          <h2 className="pf-section__title">Mes Mensurations</h2>
          <button className="pf-section__action" onClick={openEditModal}>
            <Edit3 size={12} /> Modifier
          </button>
        </div>
        <div className="pf-body-grid">
          {bodyCards.map((card) => {
            const Icon = card.icon;
            return (
              <div className="pf-body-card" key={card.label}>
                <div className={`pf-body-card__icon ${card.color}`}>
                  <Icon size={16} />
                </div>
                <span className="pf-body-card__label">{card.label}</span>
                <span className="pf-body-card__value">
                  {card.value || '—'}
                  {card.value && card.unit && <small> {card.unit}</small>}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ OBJECTIF ═══ */}
      <section className="pf-section" style={{ '--sec-d': '240ms' }}>
        <div className="pf-section__head">
          <h2 className="pf-section__title">Mon Objectif</h2>
        </div>
        <div className="pf-actions">
          <button className="pf-action" onClick={() => navigate('/goals')} style={{ '--act-d': '0ms' }}>
            <span className="pf-action__ico lime"><Target size={20} /></span>
            <div className="pf-action__body">
              <strong>{GOAL_LABELS[profile?.goal] || 'Non défini'}</strong>
              <small>Objectif actuel • {ACTIVITY_LEVEL_LABELS[profile?.activityLevel] || 'Non défini'}</small>
            </div>
            <span className="pf-action__end"><ChevronRight size={16} /></span>
          </button>
        </div>
      </section>

      {/* ═══ QUICK ACTIONS ═══ */}
      <section className="pf-section" style={{ '--sec-d': '320ms' }}>
        <div className="pf-section__head">
          <h2 className="pf-section__title">Paramètres</h2>
        </div>
        <div className="pf-actions">

          {/* Theme toggle */}
          <div className="pf-theme-card">
            {theme === 'dark' ? <Moon size={20} color="var(--violet)" /> : <Sun size={20} color="var(--amber)" />}
            <div className="pf-theme-card__info">
              <strong>{theme === 'dark' ? 'Mode Sombre' : 'Mode Clair'}</strong>
              <small>Apparence de l'interface</small>
            </div>
            <button className={`pf-toggle ${theme === 'dark' ? 'active' : ''}`} onClick={toggleTheme} aria-label="Basculer le thème">
              <span className="pf-toggle__knob">
                {theme === 'dark' ? <Moon size={10} color="#060a10" /> : <Sun size={10} color="#060a10" />}
              </span>
            </button>
          </div>

          {/* Edit Profile */}
          <button className="pf-action" onClick={openEditModal} style={{ '--act-d': '40ms' }}>
            <span className="pf-action__ico cyan"><Settings size={20} /></span>
            <div className="pf-action__body">
              <strong>Modifier mes informations</strong>
              <small>Nom, taille, poids, objectif et activité</small>
            </div>
            <span className="pf-action__end"><ChevronRight size={16} /></span>
          </button>

          {/* Account Security */}
          <button className="pf-action" onClick={() => setActiveModal('security')} style={{ '--act-d': '80ms' }}>
            <span className="pf-action__ico green"><Shield size={20} /></span>
            <div className="pf-action__body">
              <strong>Sécurité du compte</strong>
              <small>{user?.email || 'Compte sécurisé'}</small>
            </div>
            <span className="pf-action__end"><ChevronRight size={16} /></span>
          </button>

          {/* Export Data */}
          <button className="pf-action" onClick={() => setActiveModal('export')} style={{ '--act-d': '120ms' }}>
            <span className="pf-action__ico violet"><Download size={20} /></span>
            <div className="pf-action__body">
              <strong>Exporter mes données</strong>
              <small>Télécharger toutes vos données au format JSON</small>
            </div>
            <span className="pf-action__end"><ChevronRight size={16} /></span>
          </button>

          {/* Preferences / Settings */}
          <button className="pf-action" onClick={() => navigate('/settings')} style={{ '--act-d': '160ms' }}>
            <span className="pf-action__ico amber"><Sparkles size={20} /></span>
            <div className="pf-action__body">
              <strong>Préférences</strong>
              <small>Thème et réglages de l'expérience</small>
            </div>
            <span className="pf-action__end"><ChevronRight size={16} /></span>
          </button>

          {/* Delete Account */}
          <button className="pf-action" onClick={() => setActiveModal('delete')} style={{ '--act-d': '200ms' }}>
            <span className="pf-action__ico coral"><Trash2 size={20} /></span>
            <div className="pf-action__body">
              <strong>Supprimer mon compte</strong>
              <small>Action irréversible</small>
            </div>
            <span className="pf-action__end"><ChevronRight size={16} /></span>
          </button>
        </div>
      </section>

      {/* ═══ LOGOUT ═══ */}
      <section className="pf-section" style={{ '--sec-d': '400ms' }}>
        <button className="pf-logout" onClick={handleLogout}>
          <LogOut size={18} />
          Déconnexion
        </button>
      </section>

      {/* ═══ FOOTER ═══ */}
      <p className="pf-footer">FitTrack v2.0 • {memberSince}</p>


      {/* ═══════════════════════════════════════════════
          MODALS
         ═══════════════════════════════════════════════ */}

      {createPortal(
        <>
          {/* ─── EDIT PROFILE MODAL ─── */}
          {activeModal === 'edit' && (
            <div className="pf-overlay" onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}>
              <div className="pf-modal">
                <div className="pf-modal__head">
                  <h3 className="pf-modal__title">Modifier mon profil</h3>
                  <button className="pf-modal__close" onClick={() => setActiveModal(null)}><X size={18} /></button>
                </div>

                <form className="pf-form" onSubmit={handleEditSubmit}>
                  <div className="pf-field">
                    <label className="pf-field__label">Nom complet</label>
                    <input
                      className="pf-field__input"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Votre nom"
                      required
                    />
                  </div>

                  <div className="pf-field__row">
                    <div className="pf-field">
                      <label className="pf-field__label">Âge</label>
                      <input
                        className="pf-field__input"
                        type="number"
                        value={editForm.age || ''}
                        onChange={(e) => setEditForm(f => ({ ...f, age: e.target.value }))}
                        min="10" max="120"
                        required
                      />
                    </div>
                    <div className="pf-field">
                      <label className="pf-field__label">Genre</label>
                      <Select
                        name="gender"
                        value={editForm.gender || 'male'}
                        onChange={(e) => setEditForm(f => ({ ...f, gender: e.target.value }))}
                        options={[
                          { value: 'male', label: 'Homme' },
                          { value: 'female', label: 'Femme' }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="pf-field__row">
                    <div className="pf-field">
                      <label className="pf-field__label">Taille (cm)</label>
                      <input
                        className="pf-field__input"
                        type="number"
                        value={editForm.heightCm || ''}
                        onChange={(e) => setEditForm(f => ({ ...f, heightCm: e.target.value }))}
                        min="100" max="250"
                        required
                      />
                    </div>
                    <div className="pf-field">
                      <label className="pf-field__label">Poids (kg)</label>
                      <input
                        className="pf-field__input"
                        type="number"
                        step="0.1"
                        value={editForm.weightKg || ''}
                        onChange={(e) => setEditForm(f => ({ ...f, weightKg: e.target.value }))}
                        min="30" max="300"
                        required
                      />
                    </div>
                  </div>

                  <div className="pf-field">
                    <label className="pf-field__label">Poids cible (kg)</label>
                    <input
                      className="pf-field__input"
                      type="number"
                      step="0.1"
                      value={editForm.targetWeightKg || ''}
                      onChange={(e) => setEditForm(f => ({ ...f, targetWeightKg: e.target.value }))}
                      min="30" max="300"
                      placeholder="Optionnel"
                    />
                  </div>

                  <div className="pf-field">
                    <label className="pf-field__label">Niveau d'activité</label>
                    <Select
                      name="activityLevel"
                      value={editForm.activityLevel || 'sedentary'}
                      onChange={(e) => setEditForm(f => ({ ...f, activityLevel: e.target.value }))}
                      options={Object.entries(ACTIVITY_LEVEL_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                    />
                  </div>

                  <div className="pf-field">
                    <label className="pf-field__label">Objectif</label>
                    <Select
                      name="goal"
                      value={editForm.goal || 'maintenance'}
                      onChange={(e) => setEditForm(f => ({ ...f, goal: e.target.value }))}
                      options={Object.entries(GOAL_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                    />
                  </div>

                  <div className="pf-btn-row">
                    <button type="button" className="pf-btn pf-btn--secondary" onClick={() => setActiveModal(null)}>
                      Annuler
                    </button>
                    <button type="submit" className="pf-btn pf-btn--primary" disabled={editLoading}>
                      {editLoading ? <span className="spinner" /> : <><Check size={16} /> Sauvegarder</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}


          {/* ─── SECURITY MODAL ─── */}
          {activeModal === 'security' && (
            <div className="pf-overlay" onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}>
              <div className="pf-modal">
                <div className="pf-modal__head">
                  <h3 className="pf-modal__title">Sécurité du compte</h3>
                  <button className="pf-modal__close" onClick={() => setActiveModal(null)}><X size={18} /></button>
                </div>

                <div className="pf-form">
                  {/* Email info */}
                  <div className="pf-action" style={{ cursor: 'default' }}>
                    <span className="pf-action__ico green"><Mail size={18} /></span>
                    <div className="pf-action__body">
                      <strong>Email</strong>
                      <small>{user?.email || 'Non renseigné'}</small>
                    </div>
                    <span className="pf-action__end"><Shield size={14} color="var(--green)" /></span>
                  </div>

                  {/* Account status */}
                  <div className="pf-action" style={{ cursor: 'default' }}>
                    <span className="pf-action__ico cyan"><Check size={18} /></span>
                    <div className="pf-action__body">
                      <strong>Statut du compte</strong>
                      <small>{user?.emailVerified ? 'Email vérifié' : 'Email non vérifié'}</small>
                    </div>
                    <span className="pf-action__end">
                      {user?.emailVerified
                        ? <Check size={14} color="var(--green)" />
                        : <AlertTriangle size={14} color="var(--amber)" />
                      }
                    </span>
                  </div>

                  {/* Session info */}
                  <div className="pf-action" style={{ cursor: 'default' }}>
                    <span className="pf-action__ico violet"><Lock size={18} /></span>
                    <div className="pf-action__body">
                      <strong>Session</strong>
                      <small>Cookie sécurisé HTTP-Only + CSRF</small>
                    </div>
                    <span className="pf-action__end"><Shield size={14} color="var(--lime)" /></span>
                  </div>

                  <button className="pf-btn pf-btn--secondary" onClick={() => setActiveModal(null)}>
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* ─── EXPORT DATA MODAL ─── */}
          {activeModal === 'export' && (
            <div className="pf-overlay" onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}>
              <div className="pf-modal">
                <div className="pf-modal__head">
                  <h3 className="pf-modal__title">Exporter mes données</h3>
                  <button className="pf-modal__close" onClick={() => setActiveModal(null)}><X size={18} /></button>
                </div>

                <div className="pf-form">
                  <p className="pf-export-info">
                    Téléchargez toutes vos données personnelles au format JSON. Ce fichier inclut :
                  </p>

                  <div className="pf-export-list">
                    <span className="pf-export-item"><Check size={14} /> Informations du profil</span>
                    <span className="pf-export-item"><Check size={14} /> Objectifs nutritionnels</span>
                    <span className="pf-export-item"><Check size={14} /> Historique de poids</span>
                    <span className="pf-export-item"><Check size={14} /> Données d'entraînement</span>
                  </div>

                  <div className="pf-btn-row">
                    <button className="pf-btn pf-btn--secondary" onClick={() => setActiveModal(null)}>
                      Annuler
                    </button>
                    <button className="pf-btn pf-btn--primary" onClick={handleExport} disabled={exportLoading}>
                      {exportLoading ? <span className="spinner" /> : <><Download size={16} /> Exporter</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* ─── DELETE ACCOUNT MODAL ─── */}
          {activeModal === 'delete' && (
            <div className="pf-overlay" onClick={(e) => e.target === e.currentTarget && setActiveModal(null)}>
              <div className="pf-modal">
                <div className="pf-modal__head">
                  <h3 className="pf-modal__title">Supprimer le compte</h3>
                  <button className="pf-modal__close" onClick={() => setActiveModal(null)}><X size={18} /></button>
                </div>

                <div className="pf-confirm">
                  <div className="pf-confirm__icon">
                    <AlertTriangle size={28} />
                  </div>
                  <p className="pf-confirm__msg">
                    Êtes-vous sûr de vouloir supprimer votre compte ?
                  </p>
                  <p className="pf-confirm__sub">
                    Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                  </p>

                  <div className="pf-field" style={{ textAlign: 'left', marginBottom: 16 }}>
                    <label className="pf-field__label">
                      Tapez "SUPPRIMER" pour confirmer
                    </label>
                    <input
                      className="pf-field__input"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="SUPPRIMER"
                    />
                  </div>

                  <div className="pf-btn-row">
                    <button className="pf-btn pf-btn--secondary" onClick={() => { setActiveModal(null); setConfirmText(''); }}>
                      Annuler
                    </button>
                    <button
                      className="pf-btn pf-btn--danger"
                      disabled={confirmText !== 'SUPPRIMER'}
                      onClick={handleDeleteAccount}
                    >
                      <Trash2 size={16} /> Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
};
