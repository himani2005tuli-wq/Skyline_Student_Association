import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowRight, KeyRound, Mail, ShieldX, Compass, Fingerprint } from 'lucide-react';
import { authApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Badge } from '@/components/ui/primitives';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const isPasswordCompliant = (pwd) => {
  if (!pwd) return false;
  return (
    pwd.length >= 8 &&
    pwd.length <= 16 &&
    /[a-z]/.test(pwd) &&
    /[A-Z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[$@#%^&*?\-+=\!._~]/.test(pwd)
  );
};

export function PasswordRequirements({ password = '' }) {
  const rules = [
    {
      id: 'length',
      label: '8-16 characters in lenght',
      valid: password.length >= 8 && password.length <= 16,
    },
    {
      id: 'lower',
      label: 'lower case letter',
      valid: /[a-z]/.test(password),
    },
    {
      id: 'upper',
      label: 'upper case letter',
      valid: /[A-Z]/.test(password),
    },
    {
      id: 'numeric',
      label: 'numeric character',
      valid: /[0-9]/.test(password),
    },
    {
      id: 'special',
      label: 'special character: ! $ @ # % ^ & * ? - + =',
      valid: /[$@#%^&*?\-+=\!._~]/.test(password),
    },
  ];

  return (
    <ul className="mt-2.5 space-y-1.5 font-sans text-[13px]" data-testid="password-requirements">
      {rules.map((r) => (
        <li
          key={r.id}
          data-testid={`pwd-rule-${r.id}`}
          data-valid={r.valid}
          className={`flex items-center gap-2.5 transition-colors ${
            r.valid ? 'font-semibold text-slate-900' : 'font-normal text-slate-400'
          }`}
        >
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center font-bold text-sm ${
              r.valid ? 'text-blue-600' : 'text-slate-300'
            }`}
          >
            ✓
          </span>
          <span>{r.label}</span>
        </li>
      ))}
    </ul>
  );
}

const registerSchema = z
  .object({
    name: z.string().min(2, 'Tell us your name'),
    email: z.string().email('Enter a valid student email'),
    password: z
      .string()
      .min(8, 'Password must be between 8 and 16 characters')
      .max(16, 'Password must be between 8 and 16 characters')
      .refine((p) => isPasswordCompliant(p), {
        message: 'Password must satisfy all criteria below',
      }),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: "Passwords don't match" });

const ROLE_HOME = {
  member: '/member',
  student: '/member',
  admin: '/admin',
  event_manager: '/manage',
  volunteer: '/volunteer',
  treasurer: '/treasury',
  super_admin: '/system',
};

function FormError({ message }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
      data-testid="form-error"
    >
      {message}
    </p>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [root, setRoot] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  if (user) {
    return <Navigate to={location.state?.from || ROLE_HOME[user.role] || '/member'} replace />;
  }

  const onSubmit = async (data) => {
    setRoot('');
    try {
      const u = await login(data.email, data.password);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}.`);
      navigate(location.state?.from || ROLE_HOME[u.role] || '/member');
    } catch (e) {
      setRoot(e.friendly || 'Could not sign in.');
    }
  };

  return (
    <div data-testid="login-page">
      <p className="eyebrow flex items-center gap-3 text-accent-dark">
        <span className="rule-line" /> Welcome back
      </p>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-ink">Sign in.</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-4"
        noValidate
        data-testid="login-form"
      >
        <FormError message={root} />
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            placeholder="you@student.edu"
            autoComplete="email"
            data-testid="login-email-input"
            {...register('email')}
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            data-testid="login-password-input"
            {...register('password')}
          />
        </Field>
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs font-semibold text-ink/50 transition hover:text-accent-dark"
            data-testid="forgot-password-link"
          >
            Forgot password?
          </Link>
        </div>
        <Button
          type="submit"
          loading={isSubmitting}
          loadingText="Signing in…"
          size="lg"
          className="w-full"
          icon={ArrowRight}
          data-testid="login-submit-button"
        >
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink/55">
        New here?{' '}
        <Link
          to="/register"
          className="font-bold text-accent-dark"
          data-testid="login-to-register-link"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

export function Register() {
  const { user, sessionLogin } = useAuth();
  const navigate = useNavigate();
  const [root, setRoot] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) });

  if (user) {
    return <Navigate to={ROLE_HOME[user.role] || '/member'} replace />;
  }

  const passwordValue = watch('password') || '';

  const onSubmit = async (data) => {
    setRoot('');
    try {
      const u = await authApi.register(data);
      sessionLogin(u);
      toast.success('Account created successfully.');
      navigate('/member');
    } catch (e) {
      setRoot(e.friendly || 'Could not create the account.');
    }
  };

  return (
    <div data-testid="register-page">
      <p className="eyebrow flex items-center gap-3 text-accent-dark">
        <span className="rule-line" /> Join the club
      </p>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-ink">
        Create account.
      </h1>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-4"
        noValidate
        data-testid="register-form"
      >
        <FormError message={root} />
        <Field label="Full name" htmlFor="name" error={errors.name?.message}>
          <Input
            id="name"
            placeholder="Riya Sharma"
            autoComplete="name"
            data-testid="register-name-input"
            {...register('name')}
          />
        </Field>
        <Field label="Student email" htmlFor="reg-email" error={errors.email?.message}>
          <Input
            id="reg-email"
            type="email"
            placeholder="you@student.edu"
            autoComplete="email"
            data-testid="register-email-input"
            {...register('email')}
          />
        </Field>
        <div>
          <Field
            label="Password"
            htmlFor="reg-password"
            hint="8-16 chars"
            error={errors.password?.message}
          >
            <Input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              data-testid="register-password-input"
              {...register('password')}
            />
          </Field>
          <PasswordRequirements password={passwordValue} />
        </div>
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            data-testid="register-confirm-input"
            {...register('confirm')}
          />
        </Field>
        <Button
          type="submit"
          loading={isSubmitting}
          loadingText="Creating account…"
          size="lg"
          className="w-full"
          icon={ArrowRight}
          data-testid="register-submit-button"
        >
          Create account
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink/55">
        Already a member?{' '}
        <Link
          to="/login"
          className="font-bold text-accent-dark"
          data-testid="register-to-login-link"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token') || '';
  const [step, setStep] = useState(urlToken ? 2 : 1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(urlToken);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await authApi.forgotPassword(email);
      toast(r.message);
      setStep(2);
    } catch (err) {
      setError(err.friendly || 'Could not send the reset link.');
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    if (!isPasswordCompliant(password)) {
      setError('Password must satisfy all criteria below.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await authApi.resetPassword(token, password);
      toast.success(r.message);
      setStep(3);
    } catch (err) {
      setError(err.friendly || 'Reset failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="forgot-password-page">
      <p className="eyebrow flex items-center gap-3 text-accent-dark">
        <span className="rule-line" /> Account recovery
      </p>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-ink">
        Reset password.
      </h1>
      {error && (
        <div className="mt-6">
          <FormError message={error} />
        </div>
      )}
      {step === 1 && (
        <form onSubmit={send} className="mt-8 space-y-4">
          <Field label="Account email" htmlFor="fp-email">
            <Input
              id="fp-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@student.edu"
              data-testid="forgot-email-input"
            />
          </Field>
          <Button
            type="submit"
            loading={busy}
            loadingText="Sending link…"
            className="w-full"
            size="lg"
            icon={Mail}
            data-testid="forgot-send-button"
          >
            Email me a reset link
          </Button>
        </form>
      )}
      {step === 2 && (
        <form onSubmit={reset} className="mt-8 space-y-4">
          <Field label="Reset token" htmlFor="fp-token" hint="in your inbox">
            <Input
              id="fp-token"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the token"
              data-testid="forgot-token-input"
            />
          </Field>
          <div>
            <Field label="New password" htmlFor="fp-password" hint="8-16 chars">
              <Input
                id="fp-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="forgot-password-input"
              />
            </Field>
            <PasswordRequirements password={password} />
          </div>
          <Button
            type="submit"
            loading={busy}
            loadingText="Updating password…"
            className="w-full"
            size="lg"
            icon={KeyRound}
            data-testid="forgot-reset-button"
          >
            Set new password
          </Button>
        </form>
      )}
      {step === 3 && (
        <div className="mt-8 rounded-2xl bg-success-soft p-6" data-testid="forgot-success">
          <p className="font-semibold text-success">Password updated.</p>
          <p className="mt-1 text-sm text-ink/60">You can sign in with your new password now.</p>
          <Link
            to="/login"
            data-testid="forgot-success-login"
            className="mt-4 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper"
          >
            Back to sign in
          </Link>
        </div>
      )}
    </div>
  );
}

export function VerifyEmail() {
  const [params] = useSearchParams();
  const email = params.get('email');
  const { user } = useAuth();
  return (
    <div data-testid="verify-email-page">
      <p className="eyebrow flex items-center gap-3 text-accent-dark">
        <span className="rule-line" /> One more step
      </p>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-ink">
        Verify your email.
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink/60">
        We sent a verification link to <b>{email || 'your inbox'}</b>. Please click the link to confirm your account.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        {user ? (
          <Link
            to="/member"
            data-testid="verify-continue-button"
            className="rounded-full bg-ink px-6 py-3.5 text-sm font-bold text-paper"
          >
            Continue to dashboard
          </Link>
        ) : (
          <Link
            to="/login"
            data-testid="verify-login-button"
            className="rounded-full bg-ink px-6 py-3.5 text-sm font-bold text-paper"
          >
            Sign in
          </Link>
        )}
        <Link
          to="/register"
          className="rounded-full border border-ink/20 px-6 py-3.5 text-sm font-bold text-ink"
        >
          Re-register
        </Link>
      </div>
    </div>
  );
}

export function Unauthorized() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-paper px-5 text-center"
      data-testid="unauthorized-page"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger">
        <ShieldX size={28} />
      </span>
      <h1 className="mt-6 font-display text-5xl font-semibold text-ink">403</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink/55">
        This area needs different permissions. Your role doesn't include it — and the backend checks
        this on every request too.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/login"
          data-testid="unauthorized-login-link"
          className="rounded-full bg-ink px-6 py-3.5 text-sm font-bold text-paper"
        >
          Sign in as another user
        </Link>
        <Link
          to="/"
          data-testid="unauthorized-home-link"
          className="rounded-full border border-ink/20 px-6 py-3.5 text-sm font-bold text-ink"
        >
          Home
        </Link>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-ink px-5 text-center text-paper"
      data-testid="not-found-page"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-paper/20 text-accent">
        <Compass size={28} />
      </span>
      <h1 className="mt-6 font-display text-6xl font-semibold">404</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-paper/60">
        This trail doesn't exist. Let's get you back to base camp.
      </p>
      <Link
        to="/"
        data-testid="notfound-home-link"
        className="mt-8 rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-white"
      >
        Back home
      </Link>
    </div>
  );
}
