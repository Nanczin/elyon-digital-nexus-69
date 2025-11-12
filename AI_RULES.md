# AI Rules for Elyon Digital Nexus Application

This document outlines the technical stack and specific guidelines for using libraries within the Elyon Digital Nexus application. Adhering to these rules ensures consistency, maintainability, and optimal performance.

## Tech Stack Overview

*   **Frontend Framework:** React
*   **Language:** TypeScript
*   **Build Tool:** Vite
*   **UI Library:** shadcn/ui (built on Radix UI)
*   **Styling:** Tailwind CSS
*   **Routing:** React Router DOM
*   **Backend & Database:** Supabase (PostgreSQL, Authentication, Edge Functions, Storage)
*   **State Management (Server/Global):** React Query
*   **Form Management & Validation:** React Hook Form with Zod
*   **Icons:** Lucide React
*   **Date Manipulation:** date-fns
*   **Toast Notifications:** Sonner
*   **Payment Gateway Integration:** Mercado Pago SDK

## General Coding Guidelines

*   **Simplicity & Elegance:** Prioritize simple, elegant solutions. Avoid over-engineering.
*   **Modularity:** Create small, focused components and utility files. Components should generally be 100 lines of code or less.
*   **Responsiveness:** All designs must be responsive and mobile-first.
*   **Error Handling:** Do not use `try/catch` blocks for API calls unless specifically requested for user-facing error messages. Let errors bubble up for centralized handling and debugging.
*   **No Partial Implementations:** All code changes must be fully functional and complete. No placeholders or `TODO` comments for features.
*   **File Naming:** Directory names must be all lower-case (e.g., `src/pages`, `src/components`). File names may use mixed-case (e.g., `UserProfile.tsx`).

## Library Usage Rules

*   **UI Components (shadcn/ui):**
    *   **Mandatory Use:** Always use `shadcn/ui` components for UI elements (buttons, cards, forms, dialogs, etc.).
    *   **No Modification:** Do NOT modify the source code of `shadcn/ui` components directly. If a custom variant or behavior is needed, create a new component that wraps or extends the `shadcn/ui` component.
*   **Styling (Tailwind CSS):**
    *   **Exclusive Use:** All styling must be done using Tailwind CSS utility classes.
    *   **Dynamic Styles:** Use inline `style` attributes only when dynamic, JavaScript-driven values (e.g., `primaryColor` from props) are absolutely necessary.
*   **Routing (React Router DOM):**
    *   **Centralized Routes:** All application routes should be defined in `src/App.tsx`.
    *   **Navigation:** Use `Link` components for internal navigation and `useNavigate` hook for programmatic navigation.
*   **State Management (React Query):**
    *   **Server State:** Use `react-query` for fetching, caching, and updating server data (e.g., data from Supabase).
    *   **Global Client State:** For complex global client-side state that isn't server-derived, consider `react-query` or a simple React Context.
*   **Form Handling (React Hook Form & Zod):**
    *   **Forms:** All forms must be managed using `react-hook-form`.
    *   **Validation:** Use `zod` for defining form schemas and validation rules, integrated with `react-hook-form` via `@hookform/resolvers/zod`.
*   **Icons (Lucide React):**
    *   **Standard:** Use icons from the `lucide-react` library.
*   **Date Manipulation (date-fns):**
    *   **Standard:** Use `date-fns` for all date formatting, parsing, and calculations.
*   **Toast Notifications (Sonner):**
    *   **Standard:** Use `sonner` for displaying ephemeral, non-blocking notifications to the user.
*   **Backend (Supabase):**
    *   **API Interaction:** All interactions with the backend (authentication, database queries, file storage, edge functions) must use the Supabase client (`@supabase/supabase-js`).
    *   **Security:** Ensure proper row-level security (RLS) and authentication checks for all data operations.
*   **Payment Processing (Mercado Pago SDK):**
    *   **Integration:** Use `@mercadopago/sdk-react` for frontend payment form elements and `createCardToken` for tokenization.
    *   **Backend Processing:** Payment creation and verification should be handled by Supabase Edge Functions interacting with the Mercado Pago API.

## File Structure

*   `src/`: Root for all application source code.
*   `src/pages/`: Contains top-level page components (e.g., `Index.tsx`, `AdminDashboard.tsx`).
*   `src/components/`: Contains reusable UI components.
*   `src/components/ui/`: Contains `shadcn/ui` components (these should not be edited).
*   `src/components/checkout/`: Contains components specific to the checkout flow.
*   `src/components/dialogs/`: Contains dialog components.
*   `src/components/integrations/`: Contains components for integration configurations.
*   `src/hooks/`: Contains custom React hooks.
*   `src/utils/`: Contains utility functions (e.g., `textFormatting.ts`, `orderBumpUtils.ts`).
*   `src/integrations/supabase/`: Contains Supabase client and types.
*   `src/assets/`: Contains static assets like images.