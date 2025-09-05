import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface EscalationData {
  applicantName: string;
  applicationId: string;
  permitType: string;
  officeName: string;
  submissionDate: string;
  delayDays: number;
  contactAttempts: string;
  escalationLevel: 'office_head' | 'ministry' | 'ombudsman';
}

export default function EscalationLetterScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  
  const [formData, setFormData] = useState<EscalationData>({
    applicantName: '',
    applicationId: '',
    permitType: '',
    officeName: '',
    submissionDate: '',
    delayDays: 0,
    contactAttempts: '',
    escalationLevel: 'office_head'
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const generateLetter = async () => {
    if (!formData.applicantName || !formData.applicationId) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      setIsGenerating(true);
      
      const letterHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { text-align: right; margin-bottom: 30px; }
            .subject { font-weight: bold; margin: 20px 0; }
            .body { margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <strong>${formData.applicantName}</strong><br>
            Date: ${new Date().toLocaleDateString()}
          </div>
          
          <div class="subject">
            Subject: Complaint Regarding Delayed ${formData.permitType} - ${formData.applicationId}
          </div>
          
          <div class="body">
            Dear Sir/Madam,<br><br>
            
            I am writing to formally complain about the excessive delay in processing my ${formData.permitType} application (Reference: ${formData.applicationId}).<br><br>
            
            The application was submitted on ${formData.submissionDate} and has been pending for ${formData.delayDays} days beyond the expected timeline.<br><br>
            
            I have made the following attempts to contact your office:<br>
            ${formData.contactAttempts}<br><br>
            
            I request immediate attention to this matter and completion of the permit processing within 7 working days.<br><br>
            
            Yours faithfully,<br><br>
            ${formData.applicantName}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: letterHTML });
      
      Alert.alert(
        'Letter Generated',
        'Your escalation letter has been created successfully.',
        [
          { text: 'Share', onPress: () => Sharing.shareAsync(uri) },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to generate letter');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="bg-gradient-to-r from-red-600 to-orange-600 px-4 py-6">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Escalation Letter</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4"
        >
          <Text className="font-bold text-gray-900 dark:text-white mb-4">
            Letter Details
          </Text>
          
          <View className="space-y-4">
            <View>
              <Text className="text-gray-700 dark:text-gray-300 mb-2">Applicant Name *</Text>
              <TextInput
                value={formData.applicantName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, applicantName: text }))}
                placeholder="Your full name"
                className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3"
              />
            </View>
            
            <View>
              <Text className="text-gray-700 dark:text-gray-300 mb-2">Application ID *</Text>
              <TextInput
                value={formData.applicationId}
                onChangeText={(text) => setFormData(prev => ({ ...prev, applicationId: text }))}
                placeholder="e.g., TL/2024/0012"
                className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3"
              />
            </View>
            
            <View>
              <Text className="text-gray-700 dark:text-gray-300 mb-2">Permit Type</Text>
              <TextInput
                value={formData.permitType}
                onChangeText={(text) => setFormData(prev => ({ ...prev, permitType: text }))}
                placeholder="e.g., Trade License"
                className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3"
              />
            </View>
            
            <View>
              <Text className="text-gray-700 dark:text-gray-300 mb-2">Office Name</Text>
              <TextInput
                value={formData.officeName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, officeName: text }))}
                placeholder="Government office name"
                className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3"
              />
            </View>
            
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-gray-700 dark:text-gray-300 mb-2">Submission Date</Text>
                <TextInput
                  value={formData.submissionDate}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, submissionDate: text }))}
                  placeholder="YYYY-MM-DD"
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3"
                />
              </View>
              
              <View className="flex-1">
                <Text className="text-gray-700 dark:text-gray-300 mb-2">Delay Days</Text>
                <TextInput
                  value={formData.delayDays.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, delayDays: parseInt(text) || 0 }))}
                  placeholder="0"
                  keyboardType="numeric"
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3"
                />
              </View>
            </View>
            
            <View>
              <Text className="text-gray-700 dark:text-gray-300 mb-2">Contact Attempts</Text>
              <TextInput
                value={formData.contactAttempts}
                onChangeText={(text) => setFormData(prev => ({ ...prev, contactAttempts: text }))}
                placeholder="Describe your follow-up attempts"
                multiline
                numberOfLines={3}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3"
                textAlignVertical="top"
              />
            </View>
            
            <View>
              <Text className="text-gray-700 dark:text-gray-300 mb-2">Escalation Level</Text>
              <View className="space-y-2">
                {[
                  { key: 'office_head', label: 'Office Head' },
                  { key: 'ministry', label: 'Ministry Level' },
                  { key: 'ombudsman', label: 'Ombudsman' }
                ].map((level) => (
                  <TouchableOpacity
                    key={level.key}
                    onPress={() => setFormData(prev => ({ ...prev, escalationLevel: level.key as any }))}
                    className={`p-3 rounded-lg border flex-row items-center ${
                      formData.escalationLevel === level.key
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <View className={`w-4 h-4 rounded-full border-2 mr-3 ${
                      formData.escalationLevel === level.key
                        ? 'border-red-500 bg-red-500'
                        : 'border-gray-400'
                    }`} />
                    <Text className="text-gray-900 dark:text-white">{level.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </MotiView>
      </ScrollView>

      <View className="bg-white dark:bg-gray-800 px-4 py-6">
        <TouchableOpacity
          onPress={generateLetter}
          disabled={isGenerating}
          className={`py-3 rounded-xl ${
            isGenerating ? 'bg-gray-400' : 'bg-red-500'
          }`}
        >
          <Text className="text-white text-center font-bold">
            {isGenerating ? 'Generating...' : 'Generate Escalation Letter'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}