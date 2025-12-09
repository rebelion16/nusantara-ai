
import React, { useState, useEffect } from 'react';
import { GeneratorModule } from '../GeneratorModule';
import { generateStoryFromImage, refineCharacterDescription } from '../../services/geminiService';
import { ModuleId } from '../../types';
import { BookOpen, Film, Loader2 } from 'lucide-react';

interface CosplayFusionProps {
  onNavigate?: (id: ModuleId) => void;
  onTransferToStoryBoard?: (file: File) => void;
}

const GENDERS = ['Laki-laki (1 Org)', 'Perempuan (1 Org)', 'Couple (Laki+Pr)', 'Couple (Laki+Laki)', 'Couple (Pr+Pr)'];
const MODES = ['Karakter Anime', 'Video Game', 'Super Hero', 'Film / Movie', 'Tema Bebas / Genre (OC)', 'Tokoh Sejarah', 'Profesi Unik', 'Custom'];

// Helper type for character definition
type CharDef = { label: string, gender: 'Male' | 'Female' };

// Sample Data Structure for Series and Characters
const SERIES_DATA: Record<string, { name: string, chars: CharDef[] }[]> = {
  'Tema Bebas / Genre (OC)': [
    {
      name: 'Cyberpunk / Sci-Fi',
      chars: [
        { label: 'Cyberpunk Street Samurai', gender: 'Male' },
        { label: 'Futuristic Netrunner (Hacker)', gender: 'Male' },
        { label: 'Cyborg Mercenary', gender: 'Male' },
        { label: 'Space Bounty Hunter', gender: 'Male' },
        { label: 'Cyberpunk Assassin', gender: 'Female' },
        { label: 'Futuristic Netrunner (Hacker)', gender: 'Female' },
        { label: 'Android / Gynoid', gender: 'Female' },
        { label: 'Neon City Resident', gender: 'Female' }
      ]
    },
    {
      name: 'Steampunk / Retro Future',
      chars: [
        { label: 'Steampunk Inventor', gender: 'Male' },
        { label: 'Airship Captain', gender: 'Male' },
        { label: 'Victorian Gentleman with Gears', gender: 'Male' },
        { label: 'Steampunk Mechanic', gender: 'Female' },
        { label: 'Victorian Adventurer', gender: 'Female' },
        { label: 'Clockwork Doll', gender: 'Female' }
      ]
    },
    {
        name: 'Fantasy / Medieval',
        chars: [
            { label: 'Royal Knight (Armor)', gender: 'Male' },
            { label: 'Elven Ranger (Archer)', gender: 'Male' },
            { label: 'Grand Wizard', gender: 'Male' },
            { label: 'Medieval King', gender: 'Male' },
            { label: 'Elven Princess', gender: 'Female' },
            { label: 'High Priestess / Mage', gender: 'Female' },
            { label: 'Shieldmaiden (Warrior)', gender: 'Female' },
            { label: 'Medieval Queen', gender: 'Female' }
        ]
    },
    {
        name: 'Dark Fantasy',
        chars: [
            { label: 'Vampire Lord', gender: 'Male' },
            { label: 'Dark Necromancer', gender: 'Male' },
            { label: 'Fallen Angel', gender: 'Male' },
            { label: 'Vampire Queen', gender: 'Female' },
            { label: 'Gothic Witch', gender: 'Female' },
            { label: 'Dark Elf Sorceress', gender: 'Female' }
        ]
    },
    {
        name: 'Horror / Thriller',
        chars: [
            { label: 'Zombie Survivor', gender: 'Male' },
            { label: 'Creepy Clown', gender: 'Male' },
            { label: 'Ghost / Spirit', gender: 'Male' },
            { label: 'Possessed Doll', gender: 'Female' },
            { label: 'Ghost / Banshee', gender: 'Female' },
            { label: 'Vampire Hunter', gender: 'Female' }
        ]
    },
    {
        name: 'Noir / Detective',
        chars: [
            { label: 'Hardboiled Detective', gender: 'Male' },
            { label: 'Mafia Godfather', gender: 'Male' },
            { label: '1940s Mobster', gender: 'Male' },
            { label: 'Femme Fatale (Red Dress)', gender: 'Female' },
            { label: 'Lady Detective', gender: 'Female' },
            { label: 'Jazz Club Singer', gender: 'Female' }
        ]
    },
    {
        name: 'Casual / Slice of Life',
        chars: [
            { label: 'Coffee Shop Barista', gender: 'Male' },
            { label: 'University Student', gender: 'Male' },
            { label: 'Office Worker (Suit)', gender: 'Male' },
            { label: 'Streetwear Model', gender: 'Male' },
            { label: 'Casual Date Outfit', gender: 'Female' },
            { label: 'School Girl (Seifuku)', gender: 'Female' },
            { label: 'Summer Dress', gender: 'Female' },
            { label: 'Librarian / Glasses', gender: 'Female' }
        ]
    },
    {
        name: 'Profesi / Seragam',
        chars: [
            { label: 'Police Officer (SWAT)', gender: 'Male' },
            { label: 'Doctor / Surgeon', gender: 'Male' },
            { label: 'Pilot', gender: 'Male' },
            { label: 'Chef / Koki', gender: 'Male' },
            { label: 'Firefighter', gender: 'Male' },
            { label: 'Nurse / Perawat', gender: 'Female' },
            { label: 'Police Woman', gender: 'Female' },
            { label: 'Flight Attendant (Pramugari)', gender: 'Female' },
            { label: 'Doctor', gender: 'Female' },
            { label: 'Military / Soldier', gender: 'Female' }
        ]
    },
    {
        name: 'Post-Apocalyptic',
        chars: [
            { label: 'Wasteland Survivor', gender: 'Male' },
            { label: 'Gas Mask Raider', gender: 'Male' },
            { label: 'Nomad Scavenger', gender: 'Male' },
            { label: 'Wasteland Warrior', gender: 'Female' },
            { label: 'Survivalist', gender: 'Female' },
            { label: 'Desert Raider', gender: 'Female' }
        ]
    },
    {
        name: 'Cybernetic / Robotik',
        chars: [
            { label: 'Full Cyborg Soldier', gender: 'Male' },
            { label: 'Mecha Pilot Suit', gender: 'Male' },
            { label: 'Android Butler', gender: 'Male' },
            { label: 'Battle Angel (Cyborg)', gender: 'Female' },
            { label: 'Mechanical Doll', gender: 'Female' },
            { label: 'Futuristic AI Avatar', gender: 'Female' }
        ]
    },
    {
        name: 'Superhero',
        chars: [
            { label: 'Masked Vigilante', gender: 'Male' },
            { label: 'Super Soldier', gender: 'Male' },
            { label: 'Speedster Hero', gender: 'Male' },
            { label: 'Wonder Heroine', gender: 'Female' },
            { label: 'Magical Girl', gender: 'Female' },
            { label: 'Mutant Hero', gender: 'Female' }
        ]
    },
    {
        name: 'Supervillain',
        chars: [
            { label: 'Evil Mastermind (Suit)', gender: 'Male' },
            { label: 'Chaos Bringer', gender: 'Male' },
            { label: 'Mad Scientist', gender: 'Male' },
            { label: 'Evil Queen / Empress', gender: 'Female' },
            { label: 'Cat Burglar', gender: 'Female' },
            { label: 'Dark Sorceress', gender: 'Female' }
        ]
    }
  ],
  'Karakter Anime': [
    { 
      name: 'Naruto', 
      chars: [
        { label: 'Naruto Uzumaki', gender: 'Male' },
        { label: 'Sasuke Uchiha', gender: 'Male' },
        { label: 'Kakashi Hatake', gender: 'Male' },
        { label: 'Itachi Uchiha', gender: 'Male' },
        { label: 'Jiraiya', gender: 'Male' },
        { label: 'Gaara', gender: 'Male' },
        { label: 'Minato Namikaze', gender: 'Male' },
        { label: 'Madara Uchiha', gender: 'Male' },
        { label: 'Sakura Haruno', gender: 'Female' },
        { label: 'Hinata Hyuga', gender: 'Female' },
        { label: 'Tsunade', gender: 'Female' },
        { label: 'Ino Yamanaka', gender: 'Female' },
        { label: 'Temari', gender: 'Female' },
        { label: 'Konan', gender: 'Female' },
        { label: 'Kushina Uzumaki', gender: 'Female' }
      ] 
    },
    { 
      name: 'One Piece', 
      chars: [
        { label: 'Monkey D. Luffy', gender: 'Male' },
        { label: 'Roronoa Zoro', gender: 'Male' },
        { label: 'Vinsmoke Sanji', gender: 'Male' },
        { label: 'Portgas D. Ace', gender: 'Male' },
        { label: 'Trafalgar Law', gender: 'Male' },
        { label: 'Shanks', gender: 'Male' },
        { label: 'Sabo', gender: 'Male' },
        { label: 'Nami', gender: 'Female' },
        { label: 'Nico Robin', gender: 'Female' },
        { label: 'Boa Hancock', gender: 'Female' },
        { label: 'Yamato', gender: 'Female' },
        { label: 'Uta', gender: 'Female' },
        { label: 'Vivi Nefertari', gender: 'Female' },
        { label: 'Perona', gender: 'Female' }
      ] 
    },
    { 
      name: 'Pokemon', 
      chars: [
        { label: 'Ash Ketchum (Satoshi)', gender: 'Male' },
        { label: 'Brock (Takeshi)', gender: 'Male' },
        { label: 'James (Kojiro)', gender: 'Male' },
        { label: 'Red', gender: 'Male' },
        { label: 'Misty (Kasumi)', gender: 'Female' },
        { label: 'May (Haruka)', gender: 'Female' },
        { label: 'Dawn (Hikari)', gender: 'Female' },
        { label: 'Serena', gender: 'Female' },
        { label: 'Jessie (Musashi)', gender: 'Female' },
        { label: 'Cynthia (Shirona)', gender: 'Female' },
        { label: 'Nurse Joy', gender: 'Female' },
        { label: 'Lillie', gender: 'Female' },
        { label: 'Nessa', gender: 'Female' },
        { label: 'Marnie', gender: 'Female' },
        { label: 'Rosa', gender: 'Female' },
        { label: 'Hilda', gender: 'Female' },
        { label: 'Human Pikachu (Gijinka)', gender: 'Female' },
        { label: 'Human Charizard (Gijinka)', gender: 'Female' },
        { label: 'Human Eevee (Gijinka)', gender: 'Female' }
      ] 
    },
    { 
      name: 'Dragon Ball', 
      chars: [
        { label: 'Son Goku', gender: 'Male' },
        { label: 'Vegeta', gender: 'Male' },
        { label: 'Gohan', gender: 'Male' },
        { label: 'Trunks', gender: 'Male' },
        { label: 'Piccolo', gender: 'Male' },
        { label: 'Android 17', gender: 'Male' },
        { label: 'Bulma', gender: 'Female' },
        { label: 'Android 18', gender: 'Female' },
        { label: 'Chi-Chi', gender: 'Female' },
        { label: 'Videl', gender: 'Female' },
        { label: 'Launch', gender: 'Female' }
      ] 
    },
    {
      name: 'Avatar (The Last Airbender)',
      chars: [
        { label: 'Aang', gender: 'Male' },
        { label: 'Zuko', gender: 'Male' },
        { label: 'Sokka', gender: 'Male' },
        { label: 'Katara', gender: 'Female' },
        { label: 'Toph Beifong', gender: 'Female' },
        { label: 'Azula', gender: 'Female' },
        { label: 'Suki', gender: 'Female' },
        { label: 'Ty Lee', gender: 'Female' },
        { label: 'Mai', gender: 'Female' },
        { label: 'Korra', gender: 'Female' },
        { label: 'Asami Sato', gender: 'Female' },
        { label: 'Kyoshi', gender: 'Female' }
      ]
    },
    {
      name: 'Detective Conan',
      chars: [
        { label: 'Conan Edogawa', gender: 'Male' },
        { label: 'Shinichi Kudo', gender: 'Male' },
        { label: 'Kaito Kid', gender: 'Male' },
        { label: 'Heiji Hattori', gender: 'Male' },
        { label: 'Shuichi Akai', gender: 'Male' },
        { label: 'Ran Mouri', gender: 'Female' },
        { label: 'Ai Haibara', gender: 'Female' },
        { label: 'Vermouth', gender: 'Female' },
        { label: 'Masumi Sera', gender: 'Female' },
        { label: 'Kazuha Toyama', gender: 'Female' }
      ]
    },
    {
      name: 'Doraemon',
      chars: [
        { label: 'Nobita Nobi', gender: 'Male' },
        { label: 'Takeshi Goda (Giant)', gender: 'Male' },
        { label: 'Suneo Honekawa', gender: 'Male' },
        { label: 'Doraemon (Human Version)', gender: 'Male' },
        { label: 'Shizuka Minamoto', gender: 'Female' },
        { label: 'Dorami (Human Version)', gender: 'Female' },
        { label: 'Jaiko', gender: 'Female' }
      ]
    },
    {
      name: 'Studio Ghibli',
      chars: [
        { label: 'Howl Jenkins Pendragon', gender: 'Male' },
        { label: 'Haku', gender: 'Male' },
        { label: 'Ashitaka', gender: 'Male' },
        { label: 'Sophie Hatter', gender: 'Female' },
        { label: 'San (Princess Mononoke)', gender: 'Female' },
        { label: 'Kiki', gender: 'Female' },
        { label: 'Chihiro', gender: 'Female' },
        { label: 'Arrietty', gender: 'Female' }
      ]
    },
    {
      name: 'One Punch Man',
      chars: [
        { label: 'Saitama', gender: 'Male' },
        { label: 'Genos', gender: 'Male' },
        { label: 'Garou', gender: 'Male' },
        { label: 'Sonic', gender: 'Male' },
        { label: 'Tatsumaki (Tornado)', gender: 'Female' },
        { label: 'Fubuki (Blizzard)', gender: 'Female' }
      ]
    },
    { 
      name: 'My Hero Academia', 
      chars: [
        { label: 'Izuku Midoriya (Deku)', gender: 'Male' },
        { label: 'Katsuki Bakugo', gender: 'Male' },
        { label: 'Shoto Todoroki', gender: 'Male' },
        { label: 'All Might', gender: 'Male' },
        { label: 'Hawks', gender: 'Male' },
        { label: 'Ochaco Uraraka', gender: 'Female' },
        { label: 'Momo Yaoyorozu', gender: 'Female' },
        { label: 'Himiko Toga', gender: 'Female' },
        { label: 'Tsuyu Asui', gender: 'Female' },
        { label: 'Mirko', gender: 'Female' }
      ] 
    },
    { 
      name: 'Bleach', 
      chars: [
        { label: 'Ichigo Kurosaki', gender: 'Male' },
        { label: 'Byakuya Kuchiki', gender: 'Male' },
        { label: 'Toshiro Hitsugaya', gender: 'Male' },
        { label: 'Kenpachi Zaraki', gender: 'Male' },
        { label: 'Grimmjow', gender: 'Male' },
        { label: 'Ulquiorra Cifer', gender: 'Male' },
        { label: 'Rukia Kuchiki', gender: 'Female' },
        { label: 'Orihime Inoue', gender: 'Female' },
        { label: 'Yoruichi Shihoin', gender: 'Female' },
        { label: 'Rangiku Matsumoto', gender: 'Female' },
        { label: 'Neliel', gender: 'Female' }
      ] 
    },
    { 
      name: 'Demon Slayer', 
      chars: [
        { label: 'Tanjiro Kamado', gender: 'Male' },
        { label: 'Zenitsu Agatsuma', gender: 'Male' },
        { label: 'Inosuke Hashibira', gender: 'Male' },
        { label: 'Giyu Tomioka', gender: 'Male' },
        { label: 'Kyojuro Rengoku', gender: 'Male' },
        { label: 'Tengen Uzui', gender: 'Male' },
        { label: 'Nezuko Kamado', gender: 'Female' },
        { label: 'Shinobu Kocho', gender: 'Female' },
        { label: 'Mitsuri Kanroji', gender: 'Female' },
        { label: 'Kanao Tsuyuri', gender: 'Female' },
        { label: 'Daki', gender: 'Female' }
      ] 
    },
    { 
      name: 'Jujutsu Kaisen', 
      chars: [
        { label: 'Yuji Itadori', gender: 'Male' },
        { label: 'Satoru Gojo', gender: 'Male' },
        { label: 'Megumi Fushiguro', gender: 'Male' },
        { label: 'Ryomen Sukuna', gender: 'Male' },
        { label: 'Kento Nanami', gender: 'Male' },
        { label: 'Yuta Okkotsu', gender: 'Male' },
        { label: 'Toji Fushiguro', gender: 'Male' },
        { label: 'Geto Suguru', gender: 'Male' },
        { label: 'Nobara Kugisaki', gender: 'Female' },
        { label: 'Maki Zenin', gender: 'Female' },
        { label: 'Mei Mei', gender: 'Female' },
        { label: 'Yuki Tsukumo', gender: 'Female' }
      ] 
    },
    { 
      name: 'Hunter x Hunter', 
      chars: [
        { label: 'Gon Freecss', gender: 'Male' },
        { label: 'Killua Zoldyck', gender: 'Male' },
        { label: 'Kurapika', gender: 'Male' },
        { label: 'Hisoka Morow', gender: 'Male' },
        { label: 'Chrollo Lucilfer', gender: 'Male' },
        { label: 'Biscuit Krueger', gender: 'Female' },
        { label: 'Machi', gender: 'Female' },
        { label: 'Shizuku', gender: 'Female' }
      ] 
    },
    { 
      name: 'Chainsaw Man', 
      chars: [
        { label: 'Denji', gender: 'Male' },
        { label: 'Aki Hayakawa', gender: 'Male' },
        { label: 'Makima', gender: 'Female' },
        { label: 'Power', gender: 'Female' },
        { label: 'Reze', gender: 'Female' },
        { label: 'Himeno', gender: 'Female' },
        { label: 'Kobeni', gender: 'Female' }
      ] 
    },
    { 
      name: 'Inuyasha', 
      chars: [
        { label: 'Inuyasha', gender: 'Male' },
        { label: 'Sesshomaru', gender: 'Male' },
        { label: 'Miroku', gender: 'Male' },
        { label: 'Kagome Higurashi', gender: 'Female' },
        { label: 'Kikyo', gender: 'Female' },
        { label: 'Sango', gender: 'Female' }
      ] 
    },
    { 
      name: 'Spy x Family', 
      chars: [
        { label: 'Loid Forger', gender: 'Male' },
        { label: 'Yor Forger', gender: 'Female' },
        { label: 'Anya Forger', gender: 'Female' },
        { label: 'Fiona Frost', gender: 'Female' }
      ] 
    },
    { 
      name: 'Attack on Titan', 
      chars: [
        { label: 'Eren Yeager', gender: 'Male' },
        { label: 'Levi Ackerman', gender: 'Male' },
        { label: 'Armin Arlert', gender: 'Male' },
        { label: 'Erwin Smith', gender: 'Male' },
        { label: 'Mikasa Ackerman', gender: 'Female' },
        { label: 'Annie Leonhart', gender: 'Female' },
        { label: 'Historia Reiss', gender: 'Female' },
        { label: 'Sasha Braus', gender: 'Female' },
        { label: 'Hange Zoe', gender: 'Female' } 
      ] 
    },
    { 
      name: 'Fate Series', 
      chars: [
        { label: 'Gilgamesh', gender: 'Male' },
        { label: 'Emiya Shirou', gender: 'Male' },
        { label: 'Archer', gender: 'Male' },
        { label: 'Lancer (Cu Chulainn)', gender: 'Male' },
        { label: 'Saber (Artoria)', gender: 'Female' },
        { label: 'Rin Tohsaka', gender: 'Female' },
        { label: 'Jeanne d\'Arc', gender: 'Female' },
        { label: 'Nero Claudius', gender: 'Female' },
        { label: 'Ishtar', gender: 'Female' },
        { label: 'Mash Kyrielight', gender: 'Female' }
      ] 
    },
    {
      name: 'Sailor Moon',
      chars: [
        { label: 'Tuxedo Mask', gender: 'Male' },
        { label: 'Usagi Tsukino (Sailor Moon)', gender: 'Female' },
        { label: 'Ami Mizuno (Sailor Mercury)', gender: 'Female' },
        { label: 'Rei Hino (Sailor Mars)', gender: 'Female' },
        { label: 'Makoto Kino (Sailor Jupiter)', gender: 'Female' },
        { label: 'Minako Aino (Sailor Venus)', gender: 'Female' },
        { label: 'Chibiusa', gender: 'Female' }
      ]
    },
    {
      name: 'Cyberpunk: Edgerunners',
      chars: [
        { label: 'David Martinez', gender: 'Male' },
        { label: 'Lucy', gender: 'Female' },
        { label: 'Rebecca', gender: 'Female' }
      ]
    }
  ],
  'Video Game': [
    { 
      name: 'Mobile Legends', 
      chars: [
        { label: 'Alucard', gender: 'Male' },
        { label: 'Gusion', gender: 'Male' },
        { label: 'Chou', gender: 'Male' },
        { label: 'Granger', gender: 'Male' },
        { label: 'Tigreal', gender: 'Male' },
        { label: 'Yin', gender: 'Male' },
        { label: 'Ling', gender: 'Male' },
        { label: 'Miya', gender: 'Female' },
        { label: 'Layla', gender: 'Female' },
        { label: 'Fanny', gender: 'Female' },
        { label: 'Kagura', gender: 'Female' },
        { label: 'Lesley', gender: 'Female' },
        { label: 'Guinevere', gender: 'Female' },
        { label: 'Odette', gender: 'Female' },
        { label: 'Selena', gender: 'Female' },
        { label: 'Rafaela', gender: 'Female' }
      ] 
    },
    { 
      name: 'Genshin Impact', 
      chars: [
        { label: 'Zhongli', gender: 'Male' },
        { label: 'Xiao', gender: 'Male' },
        { label: 'Diluc', gender: 'Male' },
        { label: 'Tartaglia (Childe)', gender: 'Male' },
        { label: 'Alhaitham', gender: 'Male' },
        { label: 'Neuvillette', gender: 'Male' },
        { label: 'Raiden Shogun', gender: 'Female' },
        { label: 'Hu Tao', gender: 'Female' },
        { label: 'Ganyu', gender: 'Female' },
        { label: 'Yae Miko', gender: 'Female' },
        { label: 'Nahida', gender: 'Female' },
        { label: 'Furina', gender: 'Female' },
        { label: 'Navia', gender: 'Female' },
        { label: 'Kamisato Ayaka', gender: 'Female' }
      ] 
    },
    { 
      name: 'Honkai: Star Rail', 
      chars: [
        { label: 'Dan Heng', gender: 'Male' },
        { label: 'Jing Yuan', gender: 'Male' },
        { label: 'Blade', gender: 'Male' },
        { label: 'Welt Yang', gender: 'Male' },
        { label: 'Caelus (Trailblazer)', gender: 'Male' },
        { label: 'Kafka', gender: 'Female' },
        { label: 'March 7th', gender: 'Female' },
        { label: 'Himeko', gender: 'Female' },
        { label: 'Seele', gender: 'Female' },
        { label: 'Bronya', gender: 'Female' },
        { label: 'Silver Wolf', gender: 'Female' },
        { label: 'Stelle (Trailblazer)', gender: 'Female' }
      ] 
    },
    { 
      name: 'Final Fantasy', 
      chars: [
        { label: 'Cloud Strife', gender: 'Male' },
        { label: 'Sephiroth', gender: 'Male' },
        { label: 'Squall Leonhart', gender: 'Male' },
        { label: 'Tidus', gender: 'Male' },
        { label: 'Noctis', gender: 'Male' },
        { label: 'Tifa Lockhart', gender: 'Female' },
        { label: 'Aerith Gainsborough', gender: 'Female' },
        { label: 'Yuna', gender: 'Female' },
        { label: 'Lightning', gender: 'Female' },
        { label: 'Terra Branford', gender: 'Female' }
      ] 
    },
    { 
      name: 'League of Legends (Arcane)', 
      chars: [
        { label: 'Yasuo', gender: 'Male' },
        { label: 'Yone', gender: 'Male' },
        { label: 'Viego', gender: 'Male' },
        { label: 'Ezreal', gender: 'Male' },
        { label: 'Jayce', gender: 'Male' },
        { label: 'Ahri', gender: 'Female' },
        { label: 'Jinx', gender: 'Female' },
        { label: 'Vi', gender: 'Female' },
        { label: 'Lux', gender: 'Female' },
        { label: 'Akali', gender: 'Female' },
        { label: 'Kai\'sa', gender: 'Female' },
        { label: 'Caitlyn', gender: 'Female' },
        { label: 'Miss Fortune', gender: 'Female' }
      ] 
    },
    { 
      name: 'Valorant', 
      chars: [
        { label: 'Phoenix', gender: 'Male' },
        { label: 'Sova', gender: 'Male' },
        { label: 'Chamber', gender: 'Male' },
        { label: 'Yoru', gender: 'Male' },
        { label: 'Omen', gender: 'Male' },
        { label: 'Jett', gender: 'Female' },
        { label: 'Sage', gender: 'Female' },
        { label: 'Reyna', gender: 'Female' },
        { label: 'Viper', gender: 'Female' },
        { label: 'Neon', gender: 'Female' },
        { label: 'Killjoy', gender: 'Female' }
      ] 
    },
    {
      name: 'Resident Evil',
      chars: [
        { label: 'Leon S. Kennedy', gender: 'Male' },
        { label: 'Chris Redfield', gender: 'Male' },
        { label: 'Albert Wesker', gender: 'Male' },
        { label: 'Ada Wong', gender: 'Female' },
        { label: 'Jill Valentine', gender: 'Female' },
        { label: 'Claire Redfield', gender: 'Female' }
      ]
    }
  ],
  'Super Hero': [
    { 
      name: 'Marvel', 
      chars: [
        { label: 'Iron Man', gender: 'Male' },
        { label: 'Captain America', gender: 'Male' },
        { label: 'Thor', gender: 'Male' },
        { label: 'Spider-Man', gender: 'Male' },
        { label: 'Doctor Strange', gender: 'Male' },
        { label: 'Black Panther', gender: 'Male' },
        { label: 'Wolverine', gender: 'Male' },
        { label: 'Deadpool', gender: 'Male' },
        { label: 'Loki', gender: 'Male' },
        { label: 'Black Widow', gender: 'Female' },
        { label: 'Scarlet Witch', gender: 'Female' },
        { label: 'Captain Marvel', gender: 'Female' },
        { label: 'Gamora', gender: 'Female' },
        { label: 'Storm', gender: 'Female' },
        { label: 'Jean Grey', gender: 'Female' }
      ] 
    },
    { 
      name: 'DC', 
      chars: [
        { label: 'Batman', gender: 'Male' },
        { label: 'Superman', gender: 'Male' },
        { label: 'The Joker', gender: 'Male' },
        { label: 'Aquaman', gender: 'Male' },
        { label: 'The Flash', gender: 'Male' },
        { label: 'Nightwing', gender: 'Male' },
        { label: 'Wonder Woman', gender: 'Female' },
        { label: 'Harley Quinn', gender: 'Female' },
        { label: 'Catwoman', gender: 'Female' },
        { label: 'Supergirl', gender: 'Female' },
        { label: 'Poison Ivy', gender: 'Female' }
      ] 
    },
  ],
  'Film / Movie': [
    { 
      name: 'Star Wars', 
      chars: [
        { label: 'Darth Vader', gender: 'Male' },
        { label: 'Luke Skywalker', gender: 'Male' },
        { label: 'Kylo Ren', gender: 'Male' },
        { label: 'Mandalorian', gender: 'Male' },
        { label: 'Obi-Wan Kenobi', gender: 'Male' },
        { label: 'Anakin Skywalker', gender: 'Male' },
        { label: 'Princess Leia', gender: 'Female' },
        { label: 'Rey', gender: 'Female' },
        { label: 'Padme Amidala', gender: 'Female' },
        { label: 'Ahsoka Tano', gender: 'Female' }
      ] 
    },
    { 
      name: 'Harry Potter', 
      chars: [
        { label: 'Harry Potter', gender: 'Male' },
        { label: 'Ron Weasley', gender: 'Male' },
        { label: 'Draco Malfoy', gender: 'Male' },
        { label: 'Albus Dumbledore', gender: 'Male' },
        { label: 'Severus Snape', gender: 'Male' },
        { label: 'Hermione Granger', gender: 'Female' },
        { label: 'Luna Lovegood', gender: 'Female' },
        { label: 'Ginny Weasley', gender: 'Female' },
        { label: 'Bellatrix Lestrange', gender: 'Female' }
      ] 
    },
    {
      name: 'Lord of the Rings',
      chars: [
        { label: 'Aragorn', gender: 'Male' },
        { label: 'Legolas', gender: 'Male' },
        { label: 'Gandalf', gender: 'Male' },
        { label: 'Frodo Baggins', gender: 'Male' },
        { label: 'Arwen', gender: 'Female' },
        { label: 'Galadriel', gender: 'Female' },
        { label: 'Eowyn', gender: 'Female' }
      ]
    }
  ]
};

const LOCATIONS = [
  '✨ Auto (AI)', 
  'Studio Foto', 
  'Hutan Tropis (Rainforest)',
  'Hutan Fantasi', 
  'Sungai Jernih (River)',
  'Perbukitan Hijau (Hills)',
  'Bangunan Angker / Tua',
  'Kota Cyberpunk', 
  'Laboratorium Sci-Fi',
  'Medan Perang', 
  'Kastil Kerajaan', 
  'Penjara Bawah Tanah (Dungeon)',
  'Ruang Angkasa', 
  'Kuil Jepang', 
  'Pantai / Laut', 
  'Dalam Air (Underwater)',
  'Gurun Pasir',
  'Pegunungan Salju',
  'Sekolah Anime', 
  'Taman Bunga',
  'Rooftop Gedung',
  'Perpustakaan Kuno',
  '✎ Custom'
];

// Updated Times (Consistent with other modules)
const TIMES = [
  '✨ Auto (AI)', 'Matahari Terbit (Sunrise)', 'Pagi Cerah', 'Siang Hari (High Noon)', 
  'Sore (Golden Hour)', 'Senja (Blue Hour)', 'Malam (City Lights)', 'Tengah Malam (Gelap)'
];

// Updated Angles (Consistent with other modules)
const CAMERA_ANGLES = [
  '✨ Auto (AI)', 'Selevel Mata (Eye Level)', 'Sudut Rendah (Low Angle)', 'Sudut Tinggi (High Angle)', 
  'Wide Shot (Full Body)', 'Potret Close-up', 'Dutch Angle (Miring)', 'Over the Shoulder', 
  'Drone View (Aerial)', 'GoPro View (Fisheye)', 'Macro (Detail)', 'Telephoto (Compressed Background)'
];

const LIGHTING = ['✨ Auto (AI)', 'Cinematic', 'Soft Portrait', 'Rembrandt', 'Neon Glow', 'Dark & Moody', 'Natural'];

// NEW POSE STRUCTURE
const POSE_OPTIONS = [
    { value: "auto", label: "✨ Auto (AI)" },
    {
        label: "Berdiri & Formal",
        options: [
            { value: "standing_formal", label: "Berdiri Formal (Tangan di Samping)" },
            { value: "standing_elegant", label: "Berdiri Anggun (Satu Tangan di Pinggang)" },
            { value: "standing", label: "Berdiri Tegap (Standar)" },
            { value: "arms_crossed", label: "Pose Wibawa (Tangan Melipat di Dada)" },
            { value: "leaning", label: "Bersandar pada Tiang/Dinding" },
        ]
    },
    {
        label: "Duduk & Santai",
        options: [
            { value: "sitting_antique", label: "Duduk Santai di Kursi Antik" },
            { value: "sitting_floor", label: "Duduk Lesehan Anggun" },
            { value: "sitting", label: "Duduk (Umum)" },
            { value: "kneeling", label: "Berlutut" },
            { value: "meditative", label: "Pose Meditatif/Tenang" },
        ]
    },
    {
        label: "Gerakan & Aksi",
        options: [
            { value: "walking_elegant", label: "Pose Berjalan Elegan (Walking Shot)" },
            { value: "traditional_dance", label: "Pose Gerakan Tari Tradisional" },
            { value: "dynamic_fabric", label: "Pose Dinamis (Kain Berkibar)" },
            { value: "action", label: "Pose Aksi / Bertarung" },
            { value: "dynamic_jump", label: "Melompat Dinamis" },
            { value: "casting_spell", label: "Casting Spell" },
            { value: "flying", label: "Melayang / Terbang" },
        ]
    },
    {
        label: "Ekspresi & Interaksi",
        options: [
            { value: "greeting_namaste", label: "Pose Menyapa (Salam Namaste/Sembah)" },
            { value: "offering", label: "Pose Interaksi (Menawarkan Sesuatu)" },
            { value: "holding_prop", label: "Pose Memegang Properti (Kipas/Keris)" },
            { value: "candid_laugh", label: "Candid Tertawa Natural" },
            { value: "playful", label: "Gaya Bebas Ceria (Playful)" },
            { value: "touching_chin", label: "Pose Tangan Menyentuh Dagu (Reflektif)" },
            { value: "pensive", label: "Merenung (Pensive)" },
        ]
    },
    {
        label: "Artistik & Fashion",
        options: [
            { value: "fashion_editorial", label: "Pose Fashion High-End (Editorial)" },
            { value: "side_profile", label: "Pose Menoleh ke Samping (Side Profile)" },
            { value: "close_up_beauty", label: "Close Up Wajah (Beauty Portrait)" },
            { value: "silhouette_mystery", label: "Pose Siluet Misterius" },
            { value: "dramatic", label: "Dramatic Look" },
        ]
    },
    { value: "manual_pose", label: "✎ Input Manual" }
];

const VISUAL_EFFECT_OPTIONS = [
  { value: "auto", label: "✨ Auto (AI)" },
  { value: "none", label: "Tidak Ada Efek" },
  { value: "bokeh", label: "Bokeh (Background Blur)" },
  { value: "neon_glow", label: "Neon Glow (Cyberpunk)" },
  { value: "holographic", label: "Holographic Light" },
  { value: "sparkle", label: "Particle Sparkle / Magical" },
  { value: "subtle_aura", label: "Subtle Aura" },
  { value: "glitch", label: "Glitch Effect (Digital Error)" },
  { value: "motion_blur", label: "Motion Blur (Speed)" },
  { value: "film_grain", label: "Film Grain (Vintage)" },
  { value: "rain", label: "Hujan Dramatis (Rainy)" },
  { value: "fog", label: "Kabut Misterius (Foggy)" },
  { value: "cinematic", label: "Cinematic Lighting" },
  { value: "bioluminescent", label: "Bioluminescent Glow (Avatar)" },
  { value: "chromatic", label: "Chromatic Aberration" },
  { value: "fire", label: "Api & Bunga Api (Fire/Sparks)" },
  { value: "hdr", label: "HDR High Contrast" },
  { value: "surreal_liquid", label: "Surealisme: Realitas Cair" },
  { value: "fractal_dimension", label: "Dimensi Fraktal (Pecahan Realitas)" },
  { value: "pixel_glitch", label: "Pixel Sort / Data Moshing" },
  { value: "double_exposure", label: "Double Exposure (Menyatu dengan Alam)" },
  { value: "underwater", label: "Underwater Distortion (Bawah Air)" },
  { value: "sakura_petals", label: "Hujan Kelopak Sakura" },
  { value: "matrix_code", label: "Matrix Digital Rain" },
  { value: "ink_splash", label: "Tinta Hitam (Sumi-e Style)" },
  { value: "thermal_vision", label: "Thermal Vision (Panas Tubuh)" },
  { value: "xray_skeleton", label: "X-Ray / Transparan" },
  { value: "paper_cutout", label: "Paper Cutout (Dunia Kertas)" },
  { value: "glass_shatter", label: "Efek Kaca Pecah (Shattered Reality)" },
  { value: "comic_halftone", label: "Komik Halftone Dots" },
  { value: "vaporwave_grid", label: "Vaporwave Grid (Retro 80s)" },
  { value: "sketch_outline", label: "Garis Sketsa Kasar (Rough Sketch)" },
  { value: "gold_leaf", label: "Aksen Emas (Kintsugi)" },
  { value: "cosmic_nebula", label: "Aura Nebula Kosmik" },
  { value: "shadow_tendrils", label: "Tentakel Bayangan (Dark Energy)" },
  { value: "lightning_storm", label: "Badai Petir (Electric Aura)" },
  { value: "frozen_ice", label: "Beku / Kristal Es" },
  { value: "cyborg_wireframe", label: "Wireframe 3D (Blueprint)" },
  { value: "dali_melting", label: "Jam Meleleh (Surealisme Dali)" },
  { value: "impossible_geometry", label: "Geometri Mustahil (Escher Style)" },
  { value: "spirit_flame", label: "Api Roh (Blue Flame)" },
  { value: "poltergeist", label: "Poltergeist / Noise TV Lama" },
  { value: "kaleidoscope", label: "Prisma Kaleidoskop" }
];

const MAKEUP_STYLES = [
  { value: 'auto', label: '✨ Auto (AI)' },
  { value: 'natural_no_makeup', label: 'No Makeup / Natural Look' },
  { value: 'soft_glam', label: 'Soft Glam (Natural Radiance)' },
  { value: 'full_glam', label: 'Full Glam (Heavy Makeup)' },
  { value: 'editorial_fashion', label: 'Editorial / High Fashion' },
  { value: 'korean_glass_skin', label: 'Korean Glass Skin (Dewy)' },
  { value: 'smokey_eyes', label: 'Smokey Eyes & Nude Lips' },
  { value: 'vintage_retro', label: 'Vintage / Retro (Red Lips)' },
  { value: 'goth_dark', label: 'Gothic / Dark Aesthetics' },
  { value: 'fantasy_ethereal', label: 'Fantasy / Ethereal (Glitter)' },
  { value: 'cyberpunk_neon', label: 'Cyberpunk / Neon Accents' },
  { value: 'bridal', label: 'Bridal / Wedding Day' },
  { value: 'matte_finish', label: 'Matte Finish (Velvet Skin)' },
  { value: 'glossy_wet', label: 'Glossy / Wet Look' },
  { value: 'bronzed_beach', label: 'Bronzed / Sun-Kissed' }
];

export const CosplayFusionModule: React.FC<CosplayFusionProps> = ({ onNavigate, onTransferToStoryBoard }) => {
  const [gender, setGender] = useState(GENDERS[0]);
  const [mode, setMode] = useState(MODES[0]);
  
  // Series Selection
  const [seriesList, setSeriesList] = useState<{ name: string, chars: CharDef[] }[]>([]);
  const [selectedSeries, setSelectedSeries] = useState('');
  
  // Character Selection
  const [charList, setCharList] = useState<string[]>([]);
  const [selectedChar, setSelectedChar] = useState('');
  
  // Custom Input Fallback
  const [customSeries, setCustomSeries] = useState('');
  const [customChar, setCustomChar] = useState('');

  // Environment
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [customLocation, setCustomLocation] = useState('');

  const [time, setTime] = useState(TIMES[0]);
  const [angle, setAngle] = useState(CAMERA_ANGLES[0]);
  const [lighting, setLighting] = useState(LIGHTING[0]);
  
  const [pose, setPose] = useState('auto'); // Default to auto value
  const [customPose, setCustomPose] = useState('');

  const [visualEffect, setVisualEffect] = useState(VISUAL_EFFECT_OPTIONS[0].value);
  const [makeup, setMakeup] = useState(MAKEUP_STYLES[0].value);
  
  const [accessories, setAccessories] = useState('');
  
  // Story State
  const [generatedStory, setGeneratedStory] = useState('');
  const [isStoryLoading, setIsStoryLoading] = useState(false);

  // Auto Prompt for GeneratorModule
  const [autoPrompt, setAutoPrompt] = useState('');

  // Update Series List when Mode changes
  useEffect(() => {
    if (SERIES_DATA[mode]) {
      setSeriesList(SERIES_DATA[mode]);
      setSelectedSeries('');
      setCharList([]);
      setSelectedChar('');
    } else {
      setSeriesList([]); // Custom or others
    }
  }, [mode]);

  // Update Char List when Series changes OR Gender changes
  useEffect(() => {
    const found = seriesList.find(s => s.name === selectedSeries);
    if (found) {
      // Filter Logic
      const filtered = found.chars.filter(c => {
        if (gender === 'Laki-laki (1 Org)') return c.gender === 'Male';
        if (gender === 'Perempuan (1 Org)') return c.gender === 'Female';
        // For Couples, we show all characters to allow choosing the main subject
        return true; 
      });
      
      setCharList(filtered.map(c => c.label));
      setSelectedChar('');
    } else {
      setCharList([]);
    }
  }, [selectedSeries, seriesList, gender]);

  // Update Auto Prompt when Character Selection Changes
  useEffect(() => {
    if (mode === 'Custom' || !SERIES_DATA[mode]) {
        if (customChar && customSeries) {
            let genderText = 'Seorang cosplayer';
            if (gender.includes('Laki-laki')) genderText = 'Seorang pria';
            else if (gender.includes('Perempuan')) genderText = 'Seorang wanita';
            else if (gender.includes('Couple')) genderText = 'Sepasang cosplayer';
            
            setAutoPrompt(`${genderText} sedang cosplay menjadi ${customChar} from ${customSeries}. High quality detailed cosplay costume.`);
        }
    } else {
        if (selectedChar && selectedSeries) {
            setAutoPrompt(`${selectedChar} from ${selectedSeries}. High quality detailed cosplay costume.`);
        }
    }
  }, [selectedChar, selectedSeries, customChar, customSeries, mode, gender]);

  // Helper function to find label from value in the new structure
  const getPoseLabel = (val: string) => {
    if (val === 'auto') return '';
    // Flatten options to search
    for (const group of POSE_OPTIONS) {
        if ('options' in group && group.options) {
             const found = group.options.find((o: any) => o.value === val);
             if (found) return found.label;
        } else if ('value' in group && group.value === val) {
             return group.label;
        }
    }
    return val;
  };

  // --- ADVANCED MAKEUP PROMPT MAPPING FOR COSPLAY ---
  const getDetailedMakeupPrompt = (makeupValue: string) => {
    switch (makeupValue) {
      case 'auto':
        return '';
      case 'natural_no_makeup':
        return 'Professional Character Makeup: Extremely natural "no-makeup" look, perfect skin texture, subtle definition, high-res pores.';
      case 'soft_glam':
        return 'Cosplay Soft Glam: Flawless anime-style base, soft contour, defined lash line, gradient lips, airbrushed finish but realistic texture.';
      case 'full_glam':
        return 'Heavy Cosplay Glam: High coverage foundation, sharp contouring, cut-crease eyeshadow, large false lashes, matte bold lips, stage-ready makeup.';
      case 'editorial_fashion':
        return 'High-Concept Editorial Makeup: Avant-garde aesthetic, unique graphic liners, glossy skin, artistic blush placement, magazine cover quality.';
      case 'korean_glass_skin':
        return 'Korean Glass Skin (Manhwa Style): Ultra-dewy complexion, straight brows, puppy eyeliner, gradient fruit-colored lips, youthful and radiant.';
      case 'smokey_eyes':
        return 'Dramatic Smokey Eye: Intense charcoal/black gradient eyeshadow, smudged lower lash line, nude lips, intense gaze for villains or anti-heroes.';
      case 'vintage_retro':
        return 'Retro Classic Makeup: Sharp winged liner, classic red matte lips, matte skin finish, 1950s pin-up aesthetic.';
      case 'goth_dark':
        return 'Gothic Character Makeup: Pale foundation, heavy black eyeshadow, dark plum/black lipstick, sharp contours, vampire/goth aesthetic.';
      case 'fantasy_ethereal':
        return 'Ethereal Fantasy Makeup: Iridescent highlights, face gems/glitter, soft pastel tones, magical glow, elf/fairy aesthetic.';
      case 'cyberpunk_neon':
        return 'Cyberpunk Neon Makeup: UV-reactive style graphic liner (neon pink/blue), metallic skin accents, futuristic android aesthetic.';
      case 'bridal':
        return 'Bridal Cosplay Makeup: Soft pinks and peaches, radiant glowing base, romantic eye makeup, blushing cheeks, timeless beauty.';
      case 'matte_finish':
        return 'Velvet Matte Skin: Zero shine, porcelain doll-like finish, full coverage, perfect for anime character skin replication.';
      case 'glossy_wet':
        return 'Wet Look Makeup: Glossy eyelids, high-shine cheekbones, glass lips, sweaty/action hero aesthetic.';
      case 'bronzed_beach':
        return 'Sun-Kissed Beach Makeup: Warm bronzer, faux freckles, golden highlighter, summer glow suitable for swimsuit cosplay.';
      default:
        return 'High Quality Professional Cosplay Makeup.';
    }
  };

  // Prompt Construction
  const getPromptPrefix = () => {
    // Note: Character Name and Series are now handled in the visible prompt ("externalPrompt")
    // This prefix focuses on quality, environment, and system instructions.
    
    const locationVal = location === '✎ Custom' ? customLocation : location;
    
    // Resolve Pose Value for Prompt
    const poseLabel = getPoseLabel(pose);
    const poseVal = pose === 'manual_pose' ? customPose : (pose === 'auto' ? '' : poseLabel);
    
    // Find label for visual effect if possible for prompt readability, or just use value if descriptive enough
    const visualEffectLabel = VISUAL_EFFECT_OPTIONS.find(v => v.value === visualEffect)?.label || visualEffect;
    
    // Resolve Detailed Makeup
    const makeupPrompt = getDetailedMakeupPrompt(makeup);

    const details = [
      locationVal !== '✨ Auto (AI)' && locationVal ? `Location: ${locationVal}` : '',
      time !== '✨ Auto (AI)' ? `Time: ${time}` : '',
      angle !== '✨ Auto (AI)' ? `Camera Angle: ${angle}` : '',
      lighting !== '✨ Auto (AI)' ? `Lighting: ${lighting}` : '',
      poseVal ? `Pose: ${poseVal}` : '',
      visualEffect !== 'auto' ? `Visual Effect: ${visualEffectLabel}` : '',
      accessories ? `Accessories/Weapon: ${accessories}` : ''
    ].filter(Boolean).join(', ');

    return `
    [SYSTEM: COSPLAY PHOTOGRAPHY]
    Quality: 8k, Photorealistic, Ultra-Detailed, Cinematic Lighting.
    Context: Professional Cosplay Photography.
    
    [ENVIRONMENT & STYLE]
    ${details}
    
    [QUALITY CHECK]
    Texture: Real fabric, skin pores, hair strands.
    Lighting: Physically accurate.
    
    [MAKEUP INSTRUCTION]
    ${makeupPrompt ? makeupPrompt : 'Character accurate professional makeup.'}
    
    [INSTRUCTION]
    Combine the user's character description with the uploaded face. 
    Ensure the costume is accurate to the character source material.
    `;
  };

  const handleGenerateStory = async (imageUrl: string) => {
    const characterName = mode === 'Custom' || !SERIES_DATA[mode] ? customChar : selectedChar;
    if (!characterName) return;

    setIsStoryLoading(true);
    setGeneratedStory('');
    
    try {
      const story = await generateStoryFromImage(imageUrl, characterName);
      setGeneratedStory(story);
    } catch (e) {
      console.error(e);
      setGeneratedStory("Maaf, gagal membuat cerita saat ini.");
    } finally {
      setIsStoryLoading(false);
    }
  };

  const handleTransfer = async (imageUrl: string) => {
    if (!onTransferToStoryBoard || !onNavigate) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], "cosplay-result.png", { type: "image/png" });
      onTransferToStoryBoard(file);
      onNavigate('story-board');
    } catch (e) {
      console.error("Transfer failed", e);
    }
  };

  const renderCustomResultActions = (imageUrl: string) => (
    <div className="flex flex-col gap-4 mt-2">
       <div className="flex gap-2">
          <button
            onClick={() => handleGenerateStory(imageUrl)}
            disabled={isStoryLoading}
            className="flex-1 py-2 px-3 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
             {isStoryLoading ? <Loader2 size={14} className="animate-spin"/> : <BookOpen size={14}/>}
             {isStoryLoading ? 'Menulis Cerita...' : 'Buat Cerita (AI)'}
          </button>
          
          <button
            onClick={() => handleTransfer(imageUrl)}
            className="flex-1 py-2 px-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
             <Film size={14}/> Transfer ke Story Board
          </button>
       </div>

       {generatedStory && (
          <div className="bg-white/80 dark:bg-black/40 p-4 rounded-xl border border-purple-200 dark:border-purple-800 text-sm text-gray-800 dark:text-gray-200 animate-fade-in max-h-60 overflow-y-auto">
             <h4 className="font-bold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
                <BookOpen size={16}/> Cerita Karakter
             </h4>
             <p className="whitespace-pre-wrap leading-relaxed font-serif">{generatedStory}</p>
          </div>
       )}
    </div>
  );

  const extraControls = (
    <div className="space-y-4">
       <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
             <label className="text-[10px] font-semibold text-gray-500 uppercase">Gender</label>
             <select 
               value={gender}
               onChange={(e) => setGender(e.target.value)}
               className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-sm dark:text-white outline-none"
             >
               {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
             </select>
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-semibold text-gray-500 uppercase">Mode Karakter</label>
             <select 
               value={mode}
               onChange={(e) => setMode(e.target.value)}
               className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-sm dark:text-white outline-none"
             >
               {MODES.map(m => <option key={m} value={m}>{m}</option>)}
             </select>
          </div>
       </div>

       {/* Dynamic Series/Char Selection */}
       {(SERIES_DATA[mode]) ? (
         <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-gray-500 uppercase">{mode === 'Video Game' ? 'Game' : (mode === 'Tema Bebas / Genre (OC)' ? 'Genre / Tema' : 'Anime / Series')}</label>
               <select 
                 value={selectedSeries}
                 onChange={(e) => setSelectedSeries(e.target.value)}
                 className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-sm dark:text-white outline-none"
               >
                 <option value="">-- Pilih --</option>
                 {seriesList.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
               </select>
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-gray-500 uppercase">Karakter</label>
               <select 
                 value={selectedChar}
                 onChange={(e) => setSelectedChar(e.target.value)}
                 disabled={!selectedSeries}
                 className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-sm dark:text-white outline-none disabled:opacity-50"
               >
                 <option value="">-- Pilih Karakter --</option>
                 {charList.length > 0 ? (
                    charList.map(c => <option key={c} value={c}>{c}</option>)
                 ) : (
                    <option value="" disabled>Tidak ada karakter yang cocok dengan gender</option>
                 )}
               </select>
            </div>
         </div>
       ) : (
         // Fallback for Custom Modes
         <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-gray-500 uppercase">Nama Seri / Sumber</label>
               <input 
                 type="text" 
                 value={customSeries}
                 onChange={(e) => setCustomSeries(e.target.value)}
                 placeholder="Cth: Marvel, Sejarah Indonesia..."
                 className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-sm dark:text-white outline-none"
               />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-semibold text-gray-500 uppercase">Nama Karakter</label>
               <input 
                 type="text" 
                 value={customChar}
                 onChange={(e) => setCustomChar(e.target.value)}
                 placeholder="Cth: Iron Man, Gajah Mada..."
                 className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-sm dark:text-white outline-none"
               />
            </div>
         </div>
       )}

       {/* Environment Grid */}
       <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
             <label className="text-[10px] font-semibold text-gray-500 uppercase">Lokasi</label>
             {location === '✎ Custom' ? (
                <div className="flex gap-2">
                   <input 
                     type="text"
                     value={customLocation}
                     onChange={(e) => setCustomLocation(e.target.value)}
                     placeholder="Lokasi..."
                     className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-xs dark:text-white outline-none"
                     autoFocus
                   />
                   <button 
                     onClick={() => setLocation(LOCATIONS[0])}
                     className="px-2 bg-gray-200 dark:bg-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:bg-red-100 hover:text-red-500"
                   >
                     ✕
                   </button>
                </div>
             ) : (
               <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-xs dark:text-white outline-none">
                 {LOCATIONS.map(i => <option key={i} value={i}>{i}</option>)}
               </select>
             )}
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-semibold text-gray-500 uppercase">Waktu</label>
             <select value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-xs dark:text-white outline-none">
               {TIMES.map(i => <option key={i} value={i}>{i}</option>)}
             </select>
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-semibold text-gray-500 uppercase">Angle</label>
             <select value={angle} onChange={(e) => setAngle(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-xs dark:text-white outline-none">
               {CAMERA_ANGLES.map(i => <option key={i} value={i}>{i}</option>)}
             </select>
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-semibold text-gray-500 uppercase">Pencahayaan</label>
             <select value={lighting} onChange={(e) => setLighting(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-xs dark:text-white outline-none">
               {LIGHTING.map(i => <option key={i} value={i}>{i}</option>)}
             </select>
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-semibold text-gray-500 uppercase">Pose</label>
             {pose === 'manual_pose' ? (
                <div className="flex gap-2">
                   <input 
                     type="text"
                     value={customPose}
                     onChange={(e) => setCustomPose(e.target.value)}
                     placeholder="Pose..."
                     className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-xs dark:text-white outline-none"
                     autoFocus
                   />
                   <button 
                     onClick={() => setPose('auto')}
                     className="px-2 bg-gray-200 dark:bg-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:bg-red-100 hover:text-red-500"
                   >
                     ✕
                   </button>
                </div>
             ) : (
               <select value={pose} onChange={(e) => setPose(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-xs dark:text-white outline-none">
                 {POSE_OPTIONS.map((item, idx) => {
                    if ('options' in item && item.options) {
                        return (
                            <optgroup key={idx} label={item.label}>
                                {item.options.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </optgroup>
                        );
                    } else if ('value' in item) {
                        return <option key={item.value} value={item.value}>{item.label}</option>;
                    }
                    return null;
                 })}
               </select>
             )}
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-semibold text-gray-500 uppercase">Efek Visual</label>
             <select 
              value={visualEffect} 
              onChange={(e) => setVisualEffect(e.target.value)} 
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-xs dark:text-white outline-none"
             >
               {VISUAL_EFFECT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
             </select>
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-semibold text-gray-500 uppercase">Makeup</label>
             <select 
              value={makeup} 
              onChange={(e) => setMakeup(e.target.value)} 
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-2 text-xs dark:text-white outline-none"
             >
               {MAKEUP_STYLES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
             </select>
          </div>
       </div>

       <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase">Senjata/Aksesoris (Opsional)</label>
          <input 
            type="text" 
            value={accessories}
            onChange={(e) => setAccessories(e.target.value)}
            placeholder="Contoh: pedang katana, kunai, topi jerami, headset gaming..."
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 p-3 text-sm dark:text-white outline-none focus:border-primary-500"
          />
       </div>
    </div>
  );

  return (
    <GeneratorModule 
      moduleId="cosplay-fusion"
      title="Cosplay Fusion"
      description="Berubah menjadi karakter apa pun. Unggah foto Anda dan sebutkan nama karakternya."
      promptPrefix={getPromptPrefix()}
      customPromptLabel="Prompt Karakter (Otomatis/Edit)"
      
      requireImage={true}
      mainImageLabel="Wajah Utama (Wajib)"
      
      allowAdditionalFaceImage={true}
      secondFaceLabel="Wajah 2 / Partner (Opsional)"
      
      allowReferenceImage={true}
      referenceImageLabel="Referensi Kostum (Opsional)"
      
      extraControls={extraControls}
      batchModeAvailable={true}
      
      renderCustomResultActions={renderCustomResultActions}
      
      // NEW PROP: Passes the constructed prompt to the GeneratorModule input box
      externalPrompt={autoPrompt}
      
      // NEW PROP: Custom large refine button
      customRefineLabel="Berikan Deskripsi Detail"
      customRefineHandler={refineCharacterDescription}
    />
  );
};
