import { describe, it, expect } from "vitest";
import {
  // Contact transitions
  isValidContactTransition,
  getContactTransitionError,
  getValidContactNextStatuses,
  CONTACT_STATUS_TRANSITIONS,
  // Property transitions
  isValidPropertyTransition,
  PROPERTY_STATUS_TRANSITIONS,
  // Deal transitions
  isValidDealTransition,
  getValidDealNextStatuses,
  DEAL_STATUS_TRANSITIONS,
  // Generic
  validateStatusTransition,
} from "@/lib/validations/status-transitions";

describe("Status Transition Rules", () => {
  describe("CRM-006: Contact Status Transitions", () => {
    describe("LEAD transitions", () => {
      it("should allow LEAD -> CONTACTED", () => {
        expect(isValidContactTransition("LEAD", "CONTACTED")).toBe(true);
      });

      it("should allow LEAD -> INACTIVE", () => {
        expect(isValidContactTransition("LEAD", "INACTIVE")).toBe(true);
      });

      it("should not allow LEAD -> COMPLETED", () => {
        expect(isValidContactTransition("LEAD", "COMPLETED")).toBe(false);
      });

      it("should not allow LEAD -> ACTIVE (must qualify first)", () => {
        expect(isValidContactTransition("LEAD", "ACTIVE")).toBe(false);
      });
    });

    describe("QUALIFIED transitions", () => {
      it("should allow QUALIFIED -> ACTIVE", () => {
        expect(isValidContactTransition("QUALIFIED", "ACTIVE")).toBe(true);
      });

      it("should allow QUALIFIED -> INACTIVE", () => {
        expect(isValidContactTransition("QUALIFIED", "INACTIVE")).toBe(true);
      });

      it("should not allow QUALIFIED -> UNDER_CONTRACT directly", () => {
        expect(isValidContactTransition("QUALIFIED", "UNDER_CONTRACT")).toBe(false);
      });
    });

    describe("ACTIVE transitions", () => {
      it("should allow ACTIVE -> UNDER_CONTRACT", () => {
        expect(isValidContactTransition("ACTIVE", "UNDER_CONTRACT")).toBe(true);
      });

      it("should allow ACTIVE -> ON_HOLD", () => {
        expect(isValidContactTransition("ACTIVE", "ON_HOLD")).toBe(true);
      });

      it("should allow ACTIVE -> INACTIVE", () => {
        expect(isValidContactTransition("ACTIVE", "INACTIVE")).toBe(true);
      });

      it("should not allow ACTIVE -> LEAD", () => {
        expect(isValidContactTransition("ACTIVE", "LEAD")).toBe(false);
      });
    });

    describe("UNDER_CONTRACT transitions", () => {
      it("should allow UNDER_CONTRACT -> COMPLETED", () => {
        expect(isValidContactTransition("UNDER_CONTRACT", "COMPLETED")).toBe(true);
      });

      it("should allow UNDER_CONTRACT -> ACTIVE (deal fell through)", () => {
        expect(isValidContactTransition("UNDER_CONTRACT", "ACTIVE")).toBe(true);
      });
    });

    describe("COMPLETED transitions (terminal)", () => {
      it("should not allow COMPLETED -> any status", () => {
        expect(isValidContactTransition("COMPLETED", "ACTIVE")).toBe(false);
        expect(isValidContactTransition("COMPLETED", "LEAD")).toBe(false);
        expect(isValidContactTransition("COMPLETED", "INACTIVE")).toBe(false);
      });

      it("should return empty array for valid next statuses", () => {
        expect(getValidContactNextStatuses("COMPLETED")).toHaveLength(0);
      });
    });

    describe("INACTIVE transitions (re-engagement allowed)", () => {
      it("should allow INACTIVE -> LEAD (re-engage)", () => {
        expect(isValidContactTransition("INACTIVE", "LEAD")).toBe(true);
      });

      it("should allow INACTIVE -> ACTIVE (re-engage)", () => {
        expect(isValidContactTransition("INACTIVE", "ACTIVE")).toBe(true);
      });
    });

    describe("Error messages", () => {
      it("should return meaningful error for invalid transition", () => {
        const error = getContactTransitionError("LEAD", "COMPLETED");
        expect(error).toContain("LEAD");
        expect(error).toContain("COMPLETED");
        expect(error).toContain("Valid transitions");
      });

      it("should return terminal state message for COMPLETED", () => {
        const error = getContactTransitionError("COMPLETED", "ACTIVE");
        expect(error).toContain("terminal state");
      });
    });

    describe("Same status (no change)", () => {
      it("should allow staying in same status", () => {
        expect(isValidContactTransition("ACTIVE", "ACTIVE")).toBe(true);
        expect(isValidContactTransition("LEAD", "LEAD")).toBe(true);
      });
    });
  });

  describe("MLS-004: Property Status Transitions", () => {
    describe("ACTIVE transitions", () => {
      it("should allow ACTIVE -> PENDING", () => {
        expect(isValidPropertyTransition("ACTIVE", "PENDING")).toBe(true);
      });

      it("should allow ACTIVE -> WITHDRAWN", () => {
        expect(isValidPropertyTransition("ACTIVE", "WITHDRAWN")).toBe(true);
      });

      it("should allow ACTIVE -> OFF_MARKET", () => {
        expect(isValidPropertyTransition("ACTIVE", "OFF_MARKET")).toBe(true);
      });

      it("should not allow ACTIVE -> SOLD directly", () => {
        expect(isValidPropertyTransition("ACTIVE", "SOLD")).toBe(false);
      });
    });

    describe("PENDING transitions", () => {
      it("should allow PENDING -> ACTIVE (back to market)", () => {
        expect(isValidPropertyTransition("PENDING", "ACTIVE")).toBe(true);
      });

      it("should allow PENDING -> SOLD", () => {
        expect(isValidPropertyTransition("PENDING", "SOLD")).toBe(true);
      });

      it("should allow PENDING -> WITHDRAWN", () => {
        expect(isValidPropertyTransition("PENDING", "WITHDRAWN")).toBe(true);
      });
    });

    describe("SOLD transitions", () => {
      it("should allow SOLD -> OFF_MARKET (archive)", () => {
        expect(isValidPropertyTransition("SOLD", "OFF_MARKET")).toBe(true);
      });

      it("should not allow SOLD -> ACTIVE (cannot unsell)", () => {
        expect(isValidPropertyTransition("SOLD", "ACTIVE")).toBe(false);
      });

      it("should not allow SOLD -> PENDING", () => {
        expect(isValidPropertyTransition("SOLD", "PENDING")).toBe(false);
      });
    });

    describe("WITHDRAWN transitions", () => {
      it("should allow WITHDRAWN -> ACTIVE (re-list)", () => {
        expect(isValidPropertyTransition("WITHDRAWN", "ACTIVE")).toBe(true);
      });

      it("should allow WITHDRAWN -> OFF_MARKET", () => {
        expect(isValidPropertyTransition("WITHDRAWN", "OFF_MARKET")).toBe(true);
      });
    });

    describe("OFF_MARKET transitions", () => {
      it("should allow OFF_MARKET -> ACTIVE (re-list)", () => {
        expect(isValidPropertyTransition("OFF_MARKET", "ACTIVE")).toBe(true);
      });
    });
  });

  describe("DEAL-002: Deal Status Transitions", () => {
    describe("PROPOSED transitions", () => {
      it("should allow PROPOSED -> NEGOTIATING", () => {
        expect(isValidDealTransition("PROPOSED", "NEGOTIATING")).toBe(true);
      });

      it("should allow PROPOSED -> ACCEPTED", () => {
        expect(isValidDealTransition("PROPOSED", "ACCEPTED")).toBe(true);
      });

      it("should allow PROPOSED -> CANCELLED", () => {
        expect(isValidDealTransition("PROPOSED", "CANCELLED")).toBe(true);
      });

      it("should not allow PROPOSED -> COMPLETED directly", () => {
        expect(isValidDealTransition("PROPOSED", "COMPLETED")).toBe(false);
      });

      it("should not allow PROPOSED -> IN_PROGRESS directly", () => {
        expect(isValidDealTransition("PROPOSED", "IN_PROGRESS")).toBe(false);
      });
    });

    describe("NEGOTIATING transitions", () => {
      it("should allow NEGOTIATING -> ACCEPTED", () => {
        expect(isValidDealTransition("NEGOTIATING", "ACCEPTED")).toBe(true);
      });

      it("should allow NEGOTIATING -> CANCELLED", () => {
        expect(isValidDealTransition("NEGOTIATING", "CANCELLED")).toBe(true);
      });

      it("should not allow NEGOTIATING -> PROPOSED (no going back)", () => {
        expect(isValidDealTransition("NEGOTIATING", "PROPOSED")).toBe(false);
      });
    });

    describe("ACCEPTED transitions", () => {
      it("should allow ACCEPTED -> IN_PROGRESS", () => {
        expect(isValidDealTransition("ACCEPTED", "IN_PROGRESS")).toBe(true);
      });

      it("should allow ACCEPTED -> CANCELLED", () => {
        expect(isValidDealTransition("ACCEPTED", "CANCELLED")).toBe(true);
      });

      it("should not allow ACCEPTED -> COMPLETED directly", () => {
        expect(isValidDealTransition("ACCEPTED", "COMPLETED")).toBe(false);
      });
    });

    describe("IN_PROGRESS transitions", () => {
      it("should allow IN_PROGRESS -> COMPLETED", () => {
        expect(isValidDealTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
      });

      it("should allow IN_PROGRESS -> CANCELLED", () => {
        expect(isValidDealTransition("IN_PROGRESS", "CANCELLED")).toBe(true);
      });
    });

    describe("Terminal states", () => {
      it("should not allow COMPLETED -> any status", () => {
        expect(isValidDealTransition("COMPLETED", "PROPOSED")).toBe(false);
        expect(isValidDealTransition("COMPLETED", "CANCELLED")).toBe(false);
        expect(isValidDealTransition("COMPLETED", "IN_PROGRESS")).toBe(false);
      });

      it("should not allow CANCELLED -> any status", () => {
        expect(isValidDealTransition("CANCELLED", "PROPOSED")).toBe(false);
        expect(isValidDealTransition("CANCELLED", "COMPLETED")).toBe(false);
      });

      it("should return empty arrays for terminal states", () => {
        expect(getValidDealNextStatuses("COMPLETED")).toHaveLength(0);
        expect(getValidDealNextStatuses("CANCELLED")).toHaveLength(0);
      });
    });
  });

  describe("Generic validateStatusTransition", () => {
    it("should validate contact transitions correctly", () => {
      const result = validateStatusTransition("contact", "LEAD", "CONTACTED");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return error for invalid contact transition", () => {
      const result = validateStatusTransition("contact", "LEAD", "COMPLETED");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should validate property transitions correctly", () => {
      const result = validateStatusTransition("property", "ACTIVE", "PENDING");
      expect(result.valid).toBe(true);
    });

    it("should validate deal transitions correctly", () => {
      const result = validateStatusTransition("deal", "PROPOSED", "ACCEPTED");
      expect(result.valid).toBe(true);
    });

    it("should return valid next statuses", () => {
      const result = validateStatusTransition("contact", "LEAD", "COMPLETED");
      expect(result.validNextStatuses).toContain("CONTACTED");
      expect(result.validNextStatuses).toContain("INACTIVE");
    });
  });

  describe("Transition maps are complete", () => {
    it("should have all contact statuses in transition map", () => {
      const statuses = [
        "LEAD",
        "CONTACTED",
        "QUALIFIED",
        "ACTIVE",
        "UNDER_CONTRACT",
        "COMPLETED",
        "ON_HOLD",
        "INACTIVE",
      ];
      statuses.forEach(status => {
        expect(CONTACT_STATUS_TRANSITIONS).toHaveProperty(status);
      });
    });

    it("should have all property statuses in transition map", () => {
      const statuses = ["ACTIVE", "PENDING", "SOLD", "OFF_MARKET", "WITHDRAWN"];
      statuses.forEach(status => {
        expect(PROPERTY_STATUS_TRANSITIONS).toHaveProperty(status);
      });
    });

    it("should have all deal statuses in transition map", () => {
      const statuses = ["PROPOSED", "NEGOTIATING", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
      statuses.forEach(status => {
        expect(DEAL_STATUS_TRANSITIONS).toHaveProperty(status);
      });
    });
  });
});
