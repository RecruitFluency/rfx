import React from 'react';
import { motion } from 'framer-motion';
import TestimonialCard from './TestimonialCard';

const testimonials = [
  {
    name: "Alex Rodriguez",
    image: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop",
    title: "Stanford University - D1 Commit",
    quote: "RFX streamlined my recruitment process and helped me connect with top D1 programs. I'm now living my dream at Stanford!",
    stats: "Full Athletic Scholarship"
  },
  {
    name: "Maria Chen",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop",
    title: "International Player Success",
    quote: "As an international player, RFX made it possible to showcase my talents to US colleges. The platform's reach is incredible.",
    stats: "15+ D1 Offers"
  },
  {
    name: "James Wilson",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    title: "Academic & Athletic Success",
    quote: "RFX helped me find the perfect balance between academics and athletics. I'm thrilled with my D3 commitment!",
    stats: "$45k Academic Scholarship"
  },
  {
    name: "Sarah Thompson",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    title: "D2 Success Story",
    quote: "Through RFX, I found my perfect fit at a D2 program. The platform made it easy to connect with coaches who valued my style of play.",
    stats: "75% Athletic Scholarship"
  },
  {
    name: "Marcus Johnson",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    title: "NAIA Championship Player",
    quote: "RFX helped me discover NAIA programs where I could make an immediate impact. Now I'm playing for a national championship contender!",
    stats: "$28k Annual Scholarship"
  },
  {
    name: "Emma Davis",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    title: "Ivy League Achievement",
    quote: "RFX's academic-athletic matching helped me land a spot at an Ivy League school. The perfect blend of elite academics and competitive soccer!",
    stats: "Academic Excellence Award"
  },
  {
    name: "Carlos Mendoza",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
    title: "JUCO to D1 Transfer",
    quote: "Started at JUCO, used RFX to showcase my development, and now I'm transferring to a D1 program. Dreams do come true!",
    stats: "D1 Transfer Success"
  },
  {
    name: "Olivia Parker",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    title: "Multi-Sport Athlete",
    quote: "As a dual-sport athlete, RFX helped me find schools that would support both my soccer and track aspirations. Game-changing platform!",
    stats: "Dual Sport Scholarship"
  },
  {
    name: "David Kim",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    title: "Club to College Success",
    quote: "My club used RFX's white-label solution, which streamlined our entire team's recruitment process. The results were incredible!",
    stats: "100% Team Placement"
  },
  {
    name: "Maya Patel",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
    title: "Academic All-American",
    quote: "RFX's academic profile matching helped me find programs where I could excel both on the field and in the classroom.",
    stats: "4.0 GPA & Starting Position"
  }
];

const TestimonialsSection = () => {
  return (
    <section className="bg-[#121212] py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Success Stories
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Join thousands of athletes who have found their perfect college fit through RFX
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              {...testimonial}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;