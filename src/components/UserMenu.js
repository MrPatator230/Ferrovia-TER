"use client";
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/useAuth';
import styles from './UserMenu.module.css';

export default function UserMenu() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, anchorTop: -9999, anchorLeft: -9999, btnWidth: 40, btnHeight: 40 });
  const DROPDOWN_WIDTH = 320;
  const GUTTER = 8;

  // Calcule et positionne le dropdown par rapport au bouton
  const updatePosition = () => {
    const btn = buttonRef.current?.getBoundingClientRect();
    if (!btn) return;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const scrollX = window.scrollX || window.pageXOffset || 0;

    // Position dropdown: align right edge of dropdown with right edge of button
    let left = Math.round(btn.right + scrollX - DROPDOWN_WIDTH);
    left = Math.max(GUTTER, Math.min(left, window.innerWidth + scrollX - DROPDOWN_WIDTH - GUTTER));
    const top = Math.round(btn.bottom + scrollY + GUTTER);

    // Anchor (position du bouton dans le document) pour le floating button
    const anchorLeft = Math.round(btn.left + scrollX);
    const anchorTop = Math.round(btn.top + scrollY);

    setCoords({ top, left, anchorTop, anchorLeft, btnWidth: Math.round(btn.width), btnHeight: Math.round(btn.height) });
  };

  // Ouvre/ferme le menu
  const handleToggleMenu = (e) => {
    e?.stopPropagation();
    setIsOpen((v) => !v);
  };

  const handleLoginClick = () => {
    router.push('/se-connecter');
  };

  const handleProfileClick = () => {
    setIsOpen(false);
    router.push('/profil');
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  // Initial positioning on mount and whenever layout changes
  useLayoutEffect(() => {
    updatePosition();
  }, []);

  // Always listen to scroll/resize to update anchor position
  useEffect(() => {
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Recalculate when menu opens as well
  useEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen]);

  // Clic extérieur: gère le menu portal et le bouton
  useEffect(() => {
    function handleClickOutside(event) {
      const menuEl = menuRef.current;
      const btnEl = buttonRef.current;
      if (menuEl && menuEl.contains(event.target)) return;
      if (btnEl && btnEl.contains(event.target)) return; // cliquer sur le bouton gère le toggle
      setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Floating button portal (always present when user exists)
  const floatingButtonPortal = user
    ? createPortal(
        <button
          aria-hidden="false"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={handleToggleMenu}
          className={styles.floatingButton}
          style={{
            position: 'absolute',
            top: coords.anchorTop != null ? `${coords.anchorTop}px` : '-9999px',
            left: coords.anchorLeft != null ? `${coords.anchorLeft}px` : '-9999px',
            width: coords.btnWidth ? `${coords.btnWidth}px` : '40px',
            height: coords.btnHeight ? `${coords.btnHeight}px` : '40px',
            border: 'none',
            background: 'transparent',
            zIndex: 4000,
            cursor: 'pointer',
          }}
        >
          <wcs-mat-icon icon="account_circle" />
        </button>,
        document.body
      )
    : null;

  // Dropdown portal (only when open)
  const dropdownPortal = isOpen && user
    ? createPortal(
        <div
          ref={menuRef}
          className={styles.dropdown}
          style={{
            position: 'absolute',
            top: coords.top != null ? `${coords.top}px` : '-9999px',
            left: coords.left != null ? `${coords.left}px` : '-9999px',
            width: `${DROPDOWN_WIDTH}px`,
            zIndex: 2000,
          }}
          role="menu"
          aria-hidden={!isOpen}
        >
          <div className={styles.dropdownHeader}>
            <div className={styles.userAvatar}>
              <i className="icons-circle-account-connected"></i>
            </div>
            <div className={styles.userInfo}>
              <p className={styles.userName}>Bonjour, {user.prenom} !</p>
              <p className={styles.userEmail}>{user.email}</p>
            </div>
          </div>

          <div className={styles.dropdownDivider}></div>

          <div className={styles.dropdownBody}>
            <button className={styles.menuItem} onClick={handleProfileClick}>
              <i className="icons-profile"></i>
              <span>Mon espace personnel</span>
            </button>

            <button className={styles.menuItem} onClick={handleLogout}>
              <i className="icons-logout"></i>
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className={styles.userMenuContainer}>
      <div ref={buttonRef} className={styles.buttonWrapper}>
        <wcs-button
          mode="clear"
          shape="round"
          onClick={loading ? null : (user ? handleToggleMenu : handleLoginClick)}
          className={isOpen ? styles.activeButton : ''}
          style={{ position: 'relative', zIndex: 10000 }}
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <wcs-mat-icon icon="account_circle" />
        </wcs-button>
      </div>

      {floatingButtonPortal}
      {dropdownPortal}
    </div>
  );
}
