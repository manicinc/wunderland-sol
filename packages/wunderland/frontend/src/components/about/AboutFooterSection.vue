<script setup lang="ts">
import SocialIcons from '@/components/common/SocialIcons.vue';
import { getFooterSocialLinks } from '@/utils/socialLinks';

const footerLinks = getFooterSocialLinks();
</script>

<template>
  <footer class="about-page-footer-ephemeral">
    <div class="footer-content-inner-about card-glass">
      <p class="footer-credits-text max-w-full w-full">
        Voice Chat Assistant is a first-class initiative
        <strong class="highlight-text">
          powered by <a href="https://github.com/wearetheframers/agentos" target="_blank">AgentOS</a>
        </strong>.
        <br class="hidden sm:inline">
        Developed by
        <a href="https://frame.dev" target="_blank" rel="noopener noreferrer" class="footer-link">The Framers</a>
        &amp;
        <a href="https://vca.chat" target="_blank" rel="noopener noreferrer" class="footer-link">VCA Team</a>.
      </p>
      <div class="footer-social-links-group">
        <SocialIcons :links="footerLinks" variant="footer" />
      </div>
      <p class="copyright-text-about max-w-full w-full">
        VCA.chat is an experimental open-source initiative focused on making AI accessible to everyone.
      </p>
    </div>
  </footer>
</template>
