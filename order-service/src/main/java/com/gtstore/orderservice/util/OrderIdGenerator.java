package com.gtstore.orderservice.util;

public class OrderIdGenerator {
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Base32 excluding I, L, O, 0, 1
    private static final int ID_LENGTH = 10;
    private static final long FEISTEL_KEY = 0xDEADC0DEBEEFL; // Private mathematical permutation key

    /**
     * 4-Round Feistel Cipher to encrypt sequence IDs into a unique 32-bit space.
     * Every unique sequence input returns a mathematically unique encrypted output.
     */
    private static long encrypt(long val) {
        long l = (val >> 16) & 0xFFFF;
        long r = val & 0xFFFF;
        for (int i = 0; i < 4; i++) {
            long temp = r;
            r = l ^ ((r * 0xda3e789d + FEISTEL_KEY) & 0xFFFF);
            l = temp;
        }
        return ((l << 16) | r) & 0xFFFFFFFFL; // Mask to 32-bit unsigned long
    }

    /**
     * Generates a 10-character unique, non-incremental alphanumeric Order Number.
     */
    public static String generate(long sequenceNumber) {
        long encrypted = encrypt(sequenceNumber);
        StringBuilder sb = new StringBuilder();
        
        while (encrypted > 0 && sb.length() < ID_LENGTH) {
            sb.append(ALPHABET.charAt((int) (encrypted % ALPHABET.length())));
            encrypted /= ALPHABET.length();
        }
        
        // Left pad with first character in alphabet to enforce exact 10-character length
        while (sb.length() < ID_LENGTH) {
            sb.append(ALPHABET.charAt(0));
        }
        
        return sb.reverse().toString();
    }
}
