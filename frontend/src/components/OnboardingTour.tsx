"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// This adds custom styling to the driver.js popovers to match our dark theme
import "./driver-theme.css";

export default function OnboardingTour() {
  useEffect(() => {
    // Check if the user has already seen the tour
    const hasSeenTour = localStorage.getItem("cbdc_tour_seen");
    
    if (!hasSeenTour) {
      // Small timeout to allow DOM to render
      const timer = setTimeout(() => {
        const driverObj = driver({
          showProgress: true,
          animate: true,
          overlayColor: "rgba(0, 0, 0, 0.8)",
          steps: [
            {
              popover: {
                title: "Welcome to SmartBank CBDC",
                description: "Let's take a quick tour of your new dashboard.",
                side: "bottom",
                align: 'start'
              }
            },
            {
              element: 'aside',
              popover: {
                title: "Navigation Menu",
                description: "Access your different tools and the User Guide from here.",
                side: "right",
                align: 'start'
              }
            },
            {
              element: 'header',
              popover: {
                title: "Status & Identity",
                description: "Check your current account status (e.g. ACTIVE or SUSPENDED) in the top right corner.",
                side: "bottom",
                align: 'end'
              }
            }
          ],
          onDestroyStarted: () => {
            localStorage.setItem("cbdc_tour_seen", "true");
            driverObj.destroy();
          }
        });
        
        driverObj.drive();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}
