import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

const schema = z.object({
  email: z.string().trim().min(1, 'Email requis').email('Email invalide').max(255),
  password: z.string().min(1, 'Mot de passe requis').max(100),
});
interface FormValues {
  email: string;
  password: string;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPwd, setShowPwd] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
  setLoginError(null);
    try {
      await login(values);
      toast.success('Connexion réussie', { description: 'Bienvenue sur NexusMail.' });
      const from = (location.state as { from?: Location })?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Une erreur est survenue.';
      setLoginError(msg);
      toast.error('Échec de connexion', { description: msg });
    }
  };

  return (
    <AuthLayout title="Bon retour 👋" subtitle="Connectez-vous à votre espace NexusMail">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email professionnel</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="vous@institution.dz"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <button type="button" className="text-xs text-primary hover:underline" onClick={() => toast.info('Contactez votre administrateur pour réinitialiser le mot de passe.')}>
              Mot de passe oublié ?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-10"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
         {loginError && (
          <div className={`rounded-lg p-3 text-sm border ${
            loginError.includes('attente')
              ? 'bg-orange-50 border-orange-200 text-orange-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {loginError.includes('attente') && <span className="mr-1">⏳</span>}
            {loginError}
          </div>
        )}

        <Button type="submit" className="w-full h-11 rounded-xl" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connexion en cours…
            </>
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" /> Se connecter
            </>
          )}
        </Button>

        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-[11px] text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Compte démo</p>
          <p>admin@nexusmail.io · Admin1234</p>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Créer un compte
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
