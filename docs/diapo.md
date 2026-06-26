---
marp: true
theme: gaia
_class: lead
paginate: true
backgroundColor: #ffffff
color: #2c3e50
style: |
  section { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; }
  h1 { color: #2c3e50; }
  h2 { color: #16a085; }
  footer { font-size: 0.5em; color: #7f8c8d; }
footer: BUT Informatique Internship Defense — Lucas Couraudon — 2026
---

# Decision-Support Application
## ELECTRE II and Iv Methods
### End-of-Studies Internship Defense

**Presenter:** Lucas Couraudon  
**Company Supervisor:** Mr. Georgios BARDIS (University of West Attica)  
**Academic Supervisor:** Mrs. Patricia EVERAERE (IUT de Lille)  
*Defended on June 30, 2026*

---

## 1. Context & Institutional Mission
* **Host Institution:** University of West Attica (Athens, Greece).
* **Duration:** 12 weeks (April 07, 2026 — June 30, 2026).
* **The Mission:** Designing and implementing a Multicriteria Decision Analysis (MCDA) application completely from scratch.
* **Operational Need:** Streamline complex business choices where competing options oppose each other across heterogeneous and conflicting dimensions.

---

## 2. The Theoretical Challenge: MCDA Schools
* **The American School (Compensatory):**
  * Aggregates all criteria into a single utility function.
  * *Risk:* A single excellent score masks an absolute deficiency.
* **The European School (Non-Compensatory):**
  * Based on the concept of **Outranking ($a S b$)**.
  * Natively integrates indifference, incomparability, and strict veto thresholds.
  * **Target Paradigms:** ELECTRE II (Weighted) & ELECTRE Iv (Weightless).

---

## 3. Algorithmic Processing Core
### ELECTRE II: Linear Normalization & Distillations
$$n_j(a)=\frac{g_j(a)-min(g_j)}{max(g_j)-min(g_j)}$$
* Calculates Global Concordance ($C(a,b)$) vs. Discordance ($D(a,b)$).

### ELECTRE Iv: Strict Non-Compensatory Vetoes
* Validates outranking without relative criteria coefficients.
* Activation of the absolute veto barrier :
$$g_{j^*}(b) - g_{j^*}(a) > v_{j^*}$$

---

## 4. Functional Workflow & Safeguards
* **Matrix Lifecycle Controls:**
  * Strict physical lock preventing the matrix from dropping below a 2x2 layout.
* **Real-Time Integrity Engine:**
  * Key-by-keystroke interception of empty or non-numeric cells.
  * Calculation pipeline suspended instantly upon invalid input detection.
* **Polymorphic Layout Switching:**
  * Adaptive DOM restructuring based on the active calculation engine.

---

## 5. Software Architecture Patterns
* **Strict Layer Isolation:**
  * Core mathematical logic encapsulated into pure function modules.
  * Zero knowledge of graphics, rendering, or the DOM state.
* **Technical Stack Choices:**
  * **TypeScript & Node.js:** Compile-time static typing of multi-dimensional arrays.
  * **Frameworkless Approach:** Lightweight architecture using raw DOM manipulation to eliminate external overhead.

---

## 6. Engineering Pitfalls & Optimizations
* **DOM Lifecycle Resolution:**
  * Avoided local event binding issues by leveraging native event bubbling via a unified delegation hub.
* **Algorithmic Hoisting ($O(N^3) \rightarrow O(N^2)$):**
  * Amplitude calculation moved outside the nested comparison loops.
* **Defensive Arithmetic Gates:**
  * Prevention of division-by-zero on homogeneous criteria via automatic fallback mechanisms.

---

## 7. Practical Validation: Case Study
* **Scenario:** Procuring a corporate smartphone fleet (3 alternatives, 3 criteria).
* **ELECTRE II Output:** Confirms clear dominance graphs but flags cost-based vulnerabilities.
* **ELECTRE Iv Output:** Dynamic adjustment of inputs, activation of vetoes, and revelation of the strict outranking network.
* **Performance:** Fully stable execution optimized for in-memory processing.

---

## Conclusion & Perspectives
* **Technical Takeaways:** Practical mastery of modern software patterns and advanced static typing paradigms.
* **Human Takeaways:** Deepening international autonomy and technical decision-making within a foreign institution.
* **Future Evolutions:** Dynamic graph visualization modules and automated PDF/LaTeX results exporting.