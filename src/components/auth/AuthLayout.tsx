import { Mail } from 'lucide-react';
import { motion } from 'framer-motion';

export function AuthLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
      {/* Brand panel — minimalist, animated */}
      <div className="relative hidden lg:flex flex-col justify-between bg-slate-50 p-12 border-r border-slate-200/70 overflow-hidden">
        {/* subtle grid texture */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(15 23 42 / 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgb(15 23 42 / 0.04) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
          }}
        />

        {/* Header brand */}
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-slate-900">NexusMail</p>
            <p className="text-[11px] text-slate-500">Gestion Institutionnelle</p>
          </div>
        </div>

        {/* Hero animation — breathing logo with orbiting rings */}
        <div className="relative flex flex-col items-center justify-center -mt-8">
          <div className="relative h-64 w-64 flex items-center justify-center">
            {/* Outer orbit ring */}
            <motion.div
              aria-hidden
              className="absolute inset-0 rounded-full border border-primary/15"
              animate={{ rotate: 360 }}
              transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
            >
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-primary/60 shadow-[0_0_12px_2px_hsl(var(--primary)/0.45)]" />
            </motion.div>

            {/* Mid orbit ring */}
            <motion.div
              aria-hidden
              className="absolute inset-6 rounded-full border border-primary/10"
              animate={{ rotate: -360 }}
              transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            >
              <span className="absolute top-1/2 -right-1 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary/50" />
            </motion.div>

            {/* Inner pulsing halo */}
            <motion.div
              aria-hidden
              className="absolute inset-12 rounded-full bg-primary/10 blur-xl"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Breathing logo core */}
            <motion.div
              className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.35)]"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Mail className="h-10 w-10 text-primary" strokeWidth={1.5} />
              </motion.div>
            </motion.div>
          </div>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="mt-10 max-w-sm text-center"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Plateforme sécurisée
            </p>
            <h2 className="mt-3 text-[22px] font-semibold leading-snug tracking-tight text-slate-900">
              NexusMail — L'excellence au service de la{' '}
              <span className="text-slate-400">gestion institutionnelle.</span>
            </h2>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative flex items-center justify-between text-[11px] text-slate-400">
          <span>© {new Date().getFullYear()} NexusMail</span>
          <span className="flex items-center gap-1.5">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            Tous les systèmes opérationnels
          </span>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <motion.div
          key={title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden mb-10 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-slate-900">NexusMail</span>
          </div>
          <div className="mb-8">
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
