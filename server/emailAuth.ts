import type { Express, RequestHandler } from "express";
import bcrypt from "bcrypt";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { z } from "zod";
import { storage } from "./storage";

const registerSchema = z.object({
  email: z.string().email("არასწორი ელ-ფოსტის ფორმატი"),
  password: z.string().min(6, "პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("არასწორი ელ-ფოსტის ფორმატი"),
  password: z.string().min(1, "შეიყვანეთ პაროლი"),
});

const SALT_ROUNDS = 10;

function createSessionMiddleware() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

export async function setupEmailAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(createSessionMiddleware());

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: parsed.error.errors[0].message 
        });
      }

      const { email, password, firstName, lastName } = parsed.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          message: "ეს ელ-ფოსტა უკვე რეგისტრირებულია" 
        });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      
      const user = await storage.createUserWithPassword({
        email,
        passwordHash,
        firstName,
        lastName,
      });

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "სერვერის შეცდომა" });
        }
        
        (req.session as any).userId = user.id;
        (req.session as any).user = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        };
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "სერვერის შეცდომა" });
          }
          
          return res.status(201).json({
            message: "რეგისტრაცია წარმატებით დასრულდა",
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
            },
          });
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: parsed.error.errors[0].message 
        });
      }

      const { email, password } = parsed.data;

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ 
          message: "არასწორი ელ-ფოსტა ან პაროლი" 
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ 
          message: "არასწორი ელ-ფოსტა ან პაროლი" 
        });
      }

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "სერვერის შეცდომა" });
        }
        
        (req.session as any).userId = user.id;
        (req.session as any).user = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        };
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "სერვერის შეცდომა" });
          }
          
          return res.json({
            message: "შესვლა წარმატებით",
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
            },
          });
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "სერვერის შეცდომა" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "გასვლის შეცდომა" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "წარმატებით გახვედით" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    const sessionUser = (req.session as any)?.user;
    if (!sessionUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return res.json(sessionUser);
  });
}

export const isEmailAuthenticated: RequestHandler = (req, res, next) => {
  const sessionUser = (req.session as any)?.user;
  if (!sessionUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  (req as any).user = {
    claims: {
      sub: sessionUser.id,
      email: sessionUser.email,
      first_name: sessionUser.firstName,
      last_name: sessionUser.lastName,
    }
  };
  next();
};
