import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordStrength, evaluatePassword } from '@/components/auth/PasswordStrength';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { departmentService } from '@/lib/department-service';

const schema = z
  .object({
    fullName: z.string().trim().min(2, 'Nom complet requis (2 caractères min)').max(100),
    email: z.string().trim().min(1, 'Email requis').email('Email invalide').max(255),
    departmentId: z.string().min(1, 'Veuillez sélectionner un département'),
    password: z.string().min(8, 'Minimum 8 caractères').max(100)
      .refine(v => /[A-Z]/.test(v), 'Doit contenir une majuscule')
      .refine(v => /[a-z]/.test(v), 'Doit contenir une minuscule')
      .refine(v => /\d/.test(v), 'Doit contenir un chiffre'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Les mots de passe ne correspondent pas',
  });

interface FormValues { fullName: string; email: string; departmentId: string; password: string; confirmPassword: string; }

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);

  const { data: departments = [], isLoading: deptsLoading } = useQuery({
    queryKey: ['departments-register'],
    queryFn: () => departmentService.getAll(),
  });

  const { register, handleSubmit, watch, setValue, setError, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur' });

  const password = watch('password') ?? '';
  const departmentId = watch('departmentId') ?? '';

  const onSubmit = async (values: FormValues) => {
    if (evaluatePassword(values.password).some(c => !c.passed)) return;
    try {
      await registerUser({ fullName: values.fullName, email: values.email, password: values.password, departmentId: values.departmentId });
      toast.success('Compte créé', { description: 'Bienvenue ! Votre rôle sera attribué par un administrateur.' });
      navigate('/', { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Une erreur est survenue.';
      if (msg.toLowerCase().includes('email')) setError('email', { message: msg });
      else toast.error("Échec de l'inscription", { description: msg });
    }
  };

  return (
    <AuthLayout title="Créer un compte" subtitle="Rejoignez NexusMail en quelques secondes">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Nom complet</Label>
          <Input id="fullName" placeholder="Mohamed Khelifi" autoComplete="name" aria-invalid={!!errors.fullName} {...register('fullName')} />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email professionnel</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="vous@institution.dz" aria-invalid={!!errors.email} {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="department">Département</Label>
          <Select value={departmentId} onValueChange={v => setValue('departmentId', v, { shouldValidate: true })} disabled={deptsLoading}>
            <SelectTrigger id="department" aria-invalid={!!errors.departmentId}>
              <SelectValue placeholder={deptsLoading ? 'Chargement...' : 'Sélectionnez votre département'} />
            </SelectTrigger>
            <SelectContent>
              {departments.map(d => (
                <SelectItem key={d._id} value={d._id}>
                  <span className="font-medium">{d.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.departmentId && <p className="text-xs text-destructive">{errors.departmentId.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Input id="password" type={showPwd ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" className="pr-10" aria-invalid={!!errors.password} {...register('password')} />
            <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          <PasswordStrength password={password} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <Input id="confirmPassword" type={showPwd ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>

        <div className="rounded-xl border border-info/20 bg-info/5 p-3 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Note :</span> les nouveaux comptes ont par défaut le rôle{' '}
          <span className="font-medium text-foreground">Professeur</span>. Un administrateur attribuera votre rôle final dans Paramètres → Utilisateurs.
        </div>

        <Button type="submit" className="w-full h-11 rounded-xl" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création du compte…</> : <><UserPlus className="mr-2 h-4 w-4" /> Créer mon compte</>}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">Se connecter</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
