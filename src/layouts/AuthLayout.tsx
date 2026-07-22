import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';

const MODAL_CONTENT = {
  privacy: {
    title: "Privacy Policy",
    content: (
      <div className="space-y-4 text-sm text-zinc-600 leading-relaxed">
        <p>Parul University maintains a strict privacy policy to govern how it collects, uses, and protects your personal information.</p>
        <h4 className="font-semibold text-zinc-800">Data Usage & Protection</h4>
        <p>We do not sell, share, or disclose personal identifiable information acquired through our portals to any third parties or organizations unrelated to the university. Your data is used exclusively for operational purposes, service provision, and essential academic communication.</p>
        <h4 className="font-semibold text-zinc-800">Data Collection</h4>
        <p>We collect voluntary information (such as your enrollment details provided during registration) and automatic technical data (like IP addresses and cookies) to ensure secure and seamless access to the Internship Portal.</p>
      </div>
    )
  },
  terms: {
    title: "Terms and Conditions",
    content: (
      <div className="space-y-4 text-sm text-zinc-600 leading-relaxed">
        <h4 className="font-semibold text-zinc-800">Platform Usage</h4>
        <p>Users are permitted to use the Internship Portal strictly for authorized academic and professional development purposes. You may not transfer or share your access credentials with any other individual.</p>
        <h4 className="font-semibold text-zinc-800">Liability Disclaimer</h4>
        <p>Parul University and its affiliated partners do not accept liability for any direct, indirect, or consequential damages that may arise from the use of or reliance on the information provided on this platform.</p>
        <h4 className="font-semibold text-zinc-800">Compliance</h4>
        <p>By using this portal, you agree to abide by all university guidelines, including anti-ragging policies and academic integrity standards.</p>
      </div>
    )
  },
  help: {
    title: "Help Desk & Support",
    content: (
      <div className="space-y-4 text-sm text-zinc-600 leading-relaxed">
        <p>If you encounter any issues while using the Internship Portal or need assistance with your applications, our dedicated support team is here to help.</p>
        <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100 mt-2">
          <p className="font-semibold text-zinc-800 mb-2">Contact Information</p>
          <ul className="space-y-2">
            <li><span className="font-medium text-zinc-700">Email:</span> internships@paruluniversity.ac.in</li>
            <li><span className="font-medium text-zinc-700">Phone:</span> +91 2668-260300 (Ext. 102)</li>
            <li><span className="font-medium text-zinc-700">Hours:</span> Mon - Sat, 9:00 AM to 5:00 PM</li>
          </ul>
        </div>
        <p>For urgent academic inquiries, please visit the Technical Events Cell physically at the main campus.</p>
      </div>
    )
  }
};

export const AuthLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen w-full flex bg-white font-sans selection:bg-red-500/30 relative">

      {/* Light subtle background effects removed for uniform color */}

      {/* Left Section: Premium Branding (sticky so it stays in view while the
          form column scrolls on tall pages like Register) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center relative z-10 p-12 lg:sticky lg:top-0 lg:h-screen lg:self-start">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center text-center max-w-lg px-8 bg-transparent py-16 relative overflow-hidden"
        >
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            src="/pu-logo.png"
            alt="Parul University"
            className="w-72 md:w-80 max-w-[90vw] object-contain mb-8"
          />

          <div className="relative z-10">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-4xl font-bold text-blue-700 tracking-tight"
            >
              Internship Portal
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="h-1 w-16 bg-zinc-200 mx-auto mt-8 rounded-full"
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="text-zinc-500 mt-8 leading-relaxed font-medium text-lg px-2 max-w-md mx-auto"
            >
              Explore exclusive on-campus opportunities. Apply for departmental internships, assist in academic research, and gain valuable professional experience right here at University.
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* Right Section: Auth Form — scrolls naturally when the form is taller
          than the viewport (e.g. Register); short forms stay vertically centered
          via my-auto. */}
      <div className="w-full lg:w-1/2 flex flex-col items-center px-6 py-8 relative z-10 min-h-screen">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-[420px] my-auto"
        >
          <Outlet />
        </motion.div>

        {/* Footer — in normal flow below the card, so it can never overlap the
            form content; sits at the bottom edge when the form is short. */}
        <div className="hidden lg:flex justify-center z-10 px-4 pt-8 shrink-0 w-full">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="flex flex-col items-center gap-2 text-center"
          >
            <div className="flex flex-wrap justify-center gap-6 text-[13px] font-medium text-zinc-500">
              <Dialog>
                <DialogTrigger className="hover:text-zinc-900 transition-colors">Privacy Policy</DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{MODAL_CONTENT.privacy.title}</DialogTitle>
                    <DialogDescription>Last updated: August 2025</DialogDescription>
                  </DialogHeader>
                  <div className="mt-2 pr-2">
                    {MODAL_CONTENT.privacy.content}
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger className="hover:text-zinc-900 transition-colors">Terms</DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{MODAL_CONTENT.terms.title}</DialogTitle>
                    <DialogDescription>Read our terms of service.</DialogDescription>
                  </DialogHeader>
                  <div className="mt-2 pr-2">
                    {MODAL_CONTENT.terms.content}
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger className="hover:text-zinc-900 transition-colors">Help Desk</DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{MODAL_CONTENT.help.title}</DialogTitle>
                    <DialogDescription>Get assistance with the portal.</DialogDescription>
                  </DialogHeader>
                  <div className="mt-2 pr-2">
                    {MODAL_CONTENT.help.content}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium mt-2">
              © {new Date().getFullYear()} Parul University. All rights reserved.
            </p>
          </motion.div>
        </div>
      </div>

    </div>
  );
};
