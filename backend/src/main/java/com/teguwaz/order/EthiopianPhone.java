package com.teguwaz.order;

/** Ethiopian mobile numbers: accepts 09…, 07…, +2519…, 2517… and returns the 10-digit local form Chapa expects. */
public final class EthiopianPhone {

    private EthiopianPhone() {
    }

    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String digits = raw.replaceAll("[\\s\\-()]", "");
        if (digits.startsWith("+")) {
            digits = digits.substring(1);
        }
        if (digits.startsWith("251") && digits.length() == 12) {
            digits = "0" + digits.substring(3);
        } else if ((digits.startsWith("9") || digits.startsWith("7")) && digits.length() == 9) {
            digits = "0" + digits;
        }
        return digits.matches("0[79]\\d{8}") ? digits : null;
    }
}
