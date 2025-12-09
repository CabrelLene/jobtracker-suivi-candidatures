// src/App.tsx
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Application, ApplicationStatus } from './types';

import { auth } from './firebase';
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'envoyee', label: 'Envoyée' },
  { value: 'entrevue', label: 'Entrevue' },
  { value: 'refusee', label: 'Refusée' },
  { value: 'offre', label: 'Offre' },
];

type FilterStatus = ApplicationStatus | 'all';
type AuthMode = 'login' | 'register';

/* ----------------- Écran d'authentification ----------------- */

function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Email et mot de passe sont obligatoires.');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
      // onAuthStateChanged dans App s’occupe du reste
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setError('Identifiants incorrects.');
      } else if (code === 'auth/email-already-in-use') {
        setError('Un compte existe déjà avec cet email.');
      } else if (code === 'auth/weak-password') {
        setError('Mot de passe trop faible (min. 6 caractères).');
      } else {
        setError("Impossible d'effectuer l'action. Réessaie.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-shell">
        <div className="auth-side auth-side-left">
          <div className="auth-brand">
            <div className="auth-logo-mark">JT</div>
            <div className="auth-brand-text">
              <span className="auth-brand-title">JobTracker</span>
              <span className="auth-brand-subtitle">
                Cockpit de suivi de candidatures
              </span>
            </div>
          </div>

          <div className="auth-copy">
            <h1>Centralise ta recherche d&apos;emploi.</h1>
            <p>
              Un seul endroit pour suivre tes envois, relances, entrevues et offres.
              Garde une vision claire de ton pipeline, jour après jour.
            </p>
            <ul className="auth-list">
              <li>Suivi précis des candidatures et relances.</li>
              <li>Vue pipeline inspirée des dashboards modernes.</li>
              <li>Accessible partout, entièrement côté navigateur.</li>
            </ul>
          </div>
        </div>

        <div className="auth-side auth-side-right">
          <div className="auth-card">
            <div className="auth-toggle">
              <button
                type="button"
                className={
                  mode === 'login'
                    ? 'auth-toggle-btn auth-toggle-btn-active'
                    : 'auth-toggle-btn'
                }
                onClick={() => setMode('login')}
              >
                Connexion
              </button>
              <button
                type="button"
                className={
                  mode === 'register'
                    ? 'auth-toggle-btn auth-toggle-btn-active'
                    : 'auth-toggle-btn'
                }
                onClick={() => setMode('register')}
              >
                Créer un compte
              </button>
            </div>

            <div className="auth-card-header">
              <h2>{mode === 'login' ? 'Retrouve ton JobTracker' : 'Inscris-toi en 10 secondes'}</h2>
              <p>
                {mode === 'login'
                  ? 'Entre tes identifiants pour accéder à ton tableau de suivi.'
                  : 'Crée un compte pour sauvegarder tes candidatures sur ce navigateur.'}
              </p>
            </div>

            {error && <div className="alert auth-alert">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                  placeholder="ton.email@exemple.com"
                  autoComplete="email"
                />
              </div>

              <div className="form-field">
                <label htmlFor="auth-password">Mot de passe</label>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setPassword(e.target.value)
                  }
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>

              <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                {loading
                  ? mode === 'login'
                    ? 'Connexion…'
                    : 'Création du compte…'
                  : mode === 'login'
                  ? 'Se connecter'
                  : 'Créer le compte'}
              </button>
            </form>

            <p className="auth-footnote">
              Les données sont stockées en localStorage sur ce navigateur et liées à ton compte.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- App principale ---------------------- */

function App() {
  // Auth
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // JobTracker
  const [applications, setApplications] = useLocalStorage<Application[]>(
    'jobtracker_applications',
    []
  );
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [form, setForm] = useState({
    company: '',
    position: '',
    offerLink: '',
    status: 'envoyee' as ApplicationStatus,
    date: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const handleChange = (
    e: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      company: '',
      position: '',
      offerLink: '',
      status: 'envoyee',
      date: '',
      notes: '',
    });
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.company.trim() || !form.position.trim() || !form.date.trim()) {
      setError('Entreprise, poste et date sont obligatoires.');
      return;
    }

    if (editingId) {
      const updated = applications.map((a) =>
        a.id === editingId
          ? {
              ...a,
              company: form.company.trim(),
              position: form.position.trim(),
              offerLink: form.offerLink.trim() || undefined,
              status: form.status,
              date: form.date,
              notes: form.notes.trim() || undefined,
            }
          : a
      );
      setApplications(updated);
    } else {
      const newApplication: Application = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        company: form.company.trim(),
        position: form.position.trim(),
        offerLink: form.offerLink.trim() || undefined,
        status: form.status,
        date: form.date,
        notes: form.notes.trim() || undefined,
      };
      setApplications([...applications, newApplication]);
    }

    resetForm();
  };

  const handleDelete = (id: string) => {
    const target = applications.find((a) => a.id === id);
    const label = target ? `${target.position} @ ${target.company}` : 'cette candidature';

    const ok = window.confirm(
      `Tu es sur le point de supprimer définitivement « ${label} ». Continuer ?`
    );
    if (!ok) return;

    setApplications(applications.filter((a) => a.id !== id));

    if (editingId === id) {
      resetForm();
    }
  };

  const handleFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as FilterStatus;
    setFilterStatus(value);
  };

  const handleEdit = (id: string) => {
    const app = applications.find((a) => a.id === id);
    if (!app) return;

    setEditingId(id);
    setForm({
      company: app.company,
      position: app.position,
      offerLink: app.offerLink ?? '',
      status: app.status,
      date: app.date,
      notes: app.notes ?? '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetAll = () => {
    if (applications.length === 0) return;
    const ok = window.confirm(
      "Tu es sur le point de vider entièrement ton JobTracker (toutes les candidatures). Continuer ?"
    );
    if (!ok) return;
    setApplications([]);
    resetForm();
  };

  const filteredApplications = useMemo(() => {
    if (filterStatus === 'all') return applications;
    return applications.filter((a) => a.status === filterStatus);
  }, [applications, filterStatus]);

  const sortedApplications = useMemo(
    () =>
      filteredApplications
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date)),
    [filteredApplications]
  );

  const stats = useMemo(() => {
    const total = applications.length;
    const interviews = applications.filter(
      (a) => a.status === 'entrevue'
    ).length;
    const offers = applications.filter(
      (a) => a.status === 'offre'
    ).length;

    return {
      total,
      interviews,
      offers,
      interviewRate: total
        ? Math.round((interviews / total) * 100)
        : 0,
    };
  }, [applications]);

  const hasData = applications.length > 0;

  if (authLoading) {
    return (
      <div className="loader-screen">
        <div className="loader-dots">
          <span />
          <span />
          <span />
        </div>
        <p className="loader-text">Initialisation de ton espace JobTracker…</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="app">
      <div className="app-shell">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo-mark">JT</div>
            <div className="sidebar-brand">
              <span className="sidebar-title">JobTracker</span>
              <span className="sidebar-subtitle">Job search cockpit</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button
              type="button"
              className="sidebar-nav-item sidebar-nav-item--active"
            >
              Candidatures
            </button>
            <button
              type="button"
              className="sidebar-nav-item"
              disabled
            >
              Analytics (bientôt)
            </button>
            <button
              type="button"
              className="sidebar-nav-item"
              disabled
            >
              Paramètres
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-footer-row">
              <span className="sidebar-foot-label">Connecté</span>
              <span className="sidebar-foot-value">
                {user?.email ?? 'Compte'}
              </span>
            </div>
            <div className="sidebar-footer-row">
              <span className="sidebar-foot-label">Mode de stockage</span>
              <span className="sidebar-foot-value">LocalStorage</span>
            </div>
          </div>
        </aside>

        {/* MAIN AREA */}
        <div className="app-main">
          {/* TOPBAR */}
          <header className="topbar">
            <div>
              <h1 className="topbar-title">Vue d&apos;ensemble des candidatures</h1>
              <p className="topbar-subtitle">
                Visualise tes envois, relances, entrevues et offres comme sur un cockpit moderne de
                recherche d&apos;emploi.
              </p>
            </div>
            <div className="topbar-right">
              <div className="topbar-indicator">
                <span className="dot-live" />
                <span>
                  {hasData
                    ? 'Pipeline en cours'
                    : 'En attente de premières candidatures'}
                </span>
              </div>
              {hasData && (
                <button
                  type="button"
                  className="btn-ghost btn-ghost-small"
                  onClick={handleResetAll}
                >
                  Vider le tableau
                </button>
              )}
              <button
                type="button"
                className="btn-ghost btn-ghost-small"
                onClick={() => signOut(auth)}
              >
                Se déconnecter
              </button>
            </div>
          </header>

          {/* OVERVIEW / STATS */}
          <section className="overview">
            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-label">Total candidatures</span>
                <span className="stat-value">{stats.total}</span>
                <p className="stat-hint">
                  Suis ton volume global d&apos;envois et garde une cadence régulière dans ta recherche.
                </p>
              </div>

              <div className="stat-card">
                <span className="stat-label">Entrevues obtenues</span>
                <span className="stat-value">
                  {stats.interviews}
                  {stats.total > 0 && (
                    <span className="stat-badge">
                      {stats.interviewRate}% d&apos;entrevue
                    </span>
                  )}
                </span>
                <p className="stat-hint">
                  Ton taux d&apos;entrevue te donne un feedback direct sur la qualité de tes candidatures.
                </p>
              </div>

              <div className="stat-card">
                <span className="stat-label">Offres reçues</span>
                <span className="stat-value">{stats.offers}</span>
                <p className="stat-hint">
                  Compare les offres pour mieux négocier les conditions et prioriser les opportunités.
                </p>
              </div>
            </div>

            <div className="overview-note">
              <span className="overview-pill">Conseil</span>
              <span className="overview-text">
                Prends 1–2 minutes après chaque entrevue pour noter tes impressions : ça t&apos;aidera à
                ajuster tes réponses et ton storytelling.
              </span>
            </div>
          </section>

          {/* MAIN GRID */}
          <main className="main-grid">
            {/* FORMULAIRE */}
            <section className="panel panel--form">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">
                    {editingId ? 'Modifier la candidature' : 'Nouvelle candidature'}
                  </h2>
                  <p className="panel-subtitle">
                    {editingId
                      ? 'Mets à jour le statut et les notes à chaque réponse reçue pour garder une vision claire.'
                      : 'Renseigne chaque envoi avec un maximum de détails pour organiser tes relances.'}
                  </p>
                </div>
                <div className="panel-meta">
                  <span className="panel-meta-label">Candidatures actives</span>
                  <span className="panel-meta-value">{applications.length}</span>
                </div>
              </div>

              {error && <div className="alert">{error}</div>}

              <form className="form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="company">Entreprise *</label>
                    <input
                      id="company"
                      name="company"
                      value={form.company}
                      onChange={handleChange}
                      placeholder="Ex: Groupe Tech Québec"
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="position">Poste *</label>
                    <input
                      id="position"
                      name="position"
                      value={form.position}
                      onChange={handleChange}
                      placeholder="Ex: Développeur Fullstack"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="date">Date d&apos;envoi *</label>
                    <input
                      id="date"
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="status">Statut</label>
                    <select
                      id="status"
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="offerLink">Lien de l&apos;offre</label>
                  <input
                    id="offerLink"
                    name="offerLink"
                    value={form.offerLink}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="notes">Notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Détails sur le poste, personne contactée, impressions..."
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    {editingId
                      ? 'Enregistrer les modifications'
                      : 'Ajouter la candidature'}
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={resetForm}
                    >
                      Annuler la modification
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* LISTE + FILTRE */}
            <section className="panel panel--list">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Pipeline de candidatures</h2>
                  <p className="panel-subtitle">
                    Filtre ton pipeline par statut pour te concentrer sur les relances à plus fort impact.
                  </p>
                </div>
                <div className="panel-header-controls">
                  <div className="form-field form-field-inline">
                    <label htmlFor="filterStatus">Filtrer par statut</label>
                    <select
                      id="filterStatus"
                      value={filterStatus}
                      onChange={handleFilterChange}
                    >
                      <option value="all">Tous</option>
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {!hasData || sortedApplications.length === 0 ? (
                <p className="empty-state">
                  {hasData
                    ? 'Aucune candidature pour ce filtre. Change le statut ou ajoute une nouvelle entrée.'
                    : 'Commence par ajouter une première candidature pour alimenter ton pipeline.'}
                </p>
              ) : (
                <ul className="applications-list">
                  {sortedApplications.map((app) => (
                    <li key={app.id} className="application-item">
                      <div className="application-main">
                        <div>
                          <h3>
                            {app.position}{' '}
                            <span className="application-company">
                              @ {app.company}
                            </span>
                          </h3>
                          <div className="application-meta">
                            <span>
                              {new Date(app.date).toLocaleDateString()}
                            </span>
                            <span
                              className={`status-pill status-${app.status}`}
                            >
                              {
                                STATUS_OPTIONS.find(
                                  (s) => s.value === app.status
                                )?.label
                              }
                            </span>
                          </div>
                          {app.notes && (
                            <p className="application-notes">
                              {app.notes}
                            </p>
                          )}
                          {app.offerLink && (
                            <a
                              href={app.offerLink}
                              target="_blank"
                              rel="noreferrer"
                              className="application-link"
                            >
                              Voir l&apos;offre
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="application-actions">
                        <button
                          type="button"
                          className="btn-ghost btn-ghost-small"
                          onClick={() => handleEdit(app.id)}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-ghost-small btn-ghost-danger"
                          onClick={() => handleDelete(app.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
