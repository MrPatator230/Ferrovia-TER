"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UidInvalidePage() {
  const router = useRouter();
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count <= 0) {
      router.push('/se-connecter');
      return;
    }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, router]);

  return (
    <div style={{ padding: 24 }}>
      <h1>L'UID est invalide.</h1>
      <p>Redirection dans {count} seconde{count > 1 ? 's' : ''}...</p>
      <p className="small-muted">Vous serez redirigé vers le formulaire de connexion.</p>
    </div>
  );
}
