/**
 * @file PostCardSkeleton.tsx
 * @description Loading skeleton for post cards
 */

import React from 'react';
import styles from './Skeleton.module.scss';

interface PostCardSkeletonProps {
  count?: number;
}

export function PostCardSkeleton({ count = 1 }: PostCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <article key={i} className={styles.postCard}>
          <div className={styles.header}>
            <div className={`${styles.skeleton} ${styles.avatar}`} />
            <div className={styles.meta}>
              <div className={`${styles.skeleton} ${styles.name}`} />
              <div className={`${styles.skeleton} ${styles.badge}`} />
            </div>
            <div className={`${styles.skeleton} ${styles.timestamp}`} />
          </div>
          <div className={styles.content}>
            <div className={`${styles.skeleton} ${styles.line}`} />
            <div className={`${styles.skeleton} ${styles.line}`} />
            <div className={`${styles.skeleton} ${styles.lineShort}`} />
          </div>
          <div className={styles.engagement}>
            <div className={`${styles.skeleton} ${styles.action}`} />
            <div className={`${styles.skeleton} ${styles.action}`} />
            <div className={`${styles.skeleton} ${styles.action}`} />
          </div>
        </article>
      ))}
    </>
  );
}

export default PostCardSkeleton;
