import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle, Shield, Mail, Lock, Network, Cloud, Monitor } from 'lucide-react';

// Single PriorityBadge component definition
const PriorityBadge = ({ severity }) => {
    if (!severity) return null;

    const colors = {
        critical: 'bg-red-100 text-red-800 border border-red-200',
        high: 'bg-orange-100 text-orange-800 border border-orange-200',
        medium: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        low: 'bg-green-100 text-green-800 border border-green-200'
    };

    const safeColor = colors[severity.toLowerCase()] || colors.medium;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${safeColor}`}>
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </span>
    );
};

const SecurityForm = ({ formData, setFormData }) => {
    const [validationErrors, setValidationErrors] = useState({});

    const securityCategories = {
        email: {
            title: 'Email Security',
            icon: Mail,
            checks: [
                { id: 'spam_filter', label: 'Spam Filtering Solution', severity: 'high', placeholder: 'e.g., Mimecast, Proofpoint' },
                { id: 'email_encryption', label: 'Email Encryption', severity: 'critical', placeholder: 'e.g., Mimecast, Virtru' },
                { id: 'phishing_protection', label: 'Anti-Phishing Protection', severity: 'critical', placeholder: 'e.g., KnowBe4, Cofense' },
                { id: 'archiving', label: 'Email Archiving', severity: 'medium', placeholder: 'e.g., Enterprise Vault, Mimecast' },
                { id: 'dlp', label: 'Data Loss Prevention', severity: 'critical', placeholder: 'e.g., Microsoft DLP, Symantec DLP' },
                { id: 'mfa_email', label: 'Multi-Factor Authentication for Email', severity: 'critical', placeholder: 'e.g., Microsoft Authenticator, Duo' },
                { id: 'attachment_scanning', label: 'Attachment Scanning', severity: 'high', placeholder: 'e.g., Mimecast, ATP' },
                { id: 'domain_auth', label: 'DMARC/SPF/DKIM Implementation', severity: 'high', placeholder: 'e.g., DMARC Analyzer' }
            ]
        },
        password: {
            title: 'Password Security',
            icon: Lock,
            checks: [
                { id: 'password_policy', label: 'Password Policy Enforcement', severity: 'critical', placeholder: 'e.g., Azure AD, Group Policy' },
                { id: 'password_manager', label: 'Password Management Solution', severity: 'high', placeholder: 'e.g., 1Password, LastPass' },
                { id: 'mfa_apps', label: 'MFA for Critical Applications', severity: 'critical', placeholder: 'e.g., Duo, Okta Verify' },
                { id: 'sso', label: 'Single Sign-On (SSO)', severity: 'medium', placeholder: 'e.g., Okta, Azure AD' },
                { id: 'privileged_access', label: 'Privileged Access Management', severity: 'critical', placeholder: 'e.g., CyberArk, Azure PIM' },
                { id: 'password_rotation', label: 'Regular Password Rotation', severity: 'high', placeholder: 'e.g., AD Password Policy' },
                { id: 'shared_accounts', label: 'Shared Account Management', severity: 'high', placeholder: 'e.g., Passwordstate, Pleasant' }
            ]
        },
        network: {
            title: 'Network Security',
            icon: Network,
            checks: [
                { id: 'firewall', label: 'Next-Gen Firewall', severity: 'critical', placeholder: 'e.g., Palo Alto, Fortinet' },
                { id: 'vpn', label: 'VPN Access', severity: 'critical', placeholder: 'e.g., Cisco AnyConnect, FortiClient' },
                { id: 'network_monitoring', label: 'Network Monitoring', severity: 'high', placeholder: 'e.g., SolarWinds, PRTG' },
                { id: 'ids_ips', label: 'Intrusion Detection/Prevention', severity: 'critical', placeholder: 'e.g., Snort, Suricata' },
                { id: 'segmentation', label: 'Network Segmentation', severity: 'high', placeholder: 'e.g., VLANs, Micro-segmentation' },
                { id: 'wifi_security', label: 'Wi-Fi Security', severity: 'critical', placeholder: 'e.g., WPA3, Cisco Meraki' },
                { id: 'remote_access', label: 'Secure Remote Access', severity: 'critical', placeholder: 'e.g., Zero Trust, Zscaler' },
                { id: 'network_encryption', label: 'Network Traffic Encryption', severity: 'critical', placeholder: 'e.g., TLS 1.3, IPsec' }
            ]
        },
        endpoint: {
            title: 'Endpoint Security',
            icon: Monitor,
            checks: [
                { id: 'antivirus', label: 'Antivirus/EDR Solution', severity: 'critical', placeholder: 'e.g., CrowdStrike, SentinelOne' },
                { id: 'patch_management', label: 'Patch Management', severity: 'critical', placeholder: 'e.g., SCCM, Ivanti' },
                { id: 'disk_encryption', label: 'Disk Encryption', severity: 'critical', placeholder: 'e.g., BitLocker, FileVault' },
                { id: 'mobile_mdm', label: 'Mobile Device Management', severity: 'high', placeholder: 'e.g., Intune, AirWatch' },
                { id: 'usb_control', label: 'USB Device Control', severity: 'medium', placeholder: 'e.g., Windows Defender, McAfee' },
                { id: 'endpoint_backup', label: 'Endpoint Backup Solution', severity: 'high', placeholder: 'e.g., Veeam, Druva' }
            ]
        },
        cloud: {
            title: 'Cloud Security',
            icon: Cloud,
            checks: [
                { id: 'cloud_backup', label: 'Cloud Backup Solution', severity: 'critical', placeholder: 'e.g., Veeam, Acronis' },
                { id: 'cloud_access', label: 'Cloud Access Security Broker', severity: 'high', placeholder: 'e.g., Microsoft Defender for Cloud Apps' },
                { id: 'saas_security', label: 'SaaS Security Assessment', severity: 'high', placeholder: 'e.g., Microsoft Secure Score' },
                { id: 'cloud_encryption', label: 'Cloud Data Encryption', severity: 'critical', placeholder: 'e.g., AWS KMS, Azure Key Vault' },
                { id: 'cloud_monitoring', label: 'Cloud Activity Monitoring', severity: 'high', placeholder: 'e.g., CloudWatch, Azure Monitor' }
            ]
        }
    };

    // Initialize security assessment if it doesn't exist
    if (!formData.sites[0].security) {
        const initialSecurity = {};
        Object.keys(securityCategories).forEach(category => {
            initialSecurity[category] = {
                checks: {},
                notes: ''
            };
            securityCategories[category].checks.forEach(check => {
                initialSecurity[category].checks[check.id] = {
                    implemented: false,
                    severity: check.severity,
                    product: '',
                    notes: ''
                };
            });
        });
        const updatedSites = [...formData.sites];
        updatedSites[0].security = initialSecurity;
        setFormData({ ...formData, sites: updatedSites });
    }

    const handleCheckChange = (category, checkId, field, value) => {
        const updatedSites = [...formData.sites];
        updatedSites[0].security[category].checks[checkId][field] = value;
        setFormData({ ...formData, sites: updatedSites });
    };

    const handleNotesChange = (category, value) => {
        const updatedSites = [...formData.sites];
        updatedSites[0].security[category].notes = value;
        setFormData({ ...formData, sites: updatedSites });
    };

    return (
        <div className="space-y-8">
            {Object.entries(securityCategories).map(([category, { title, icon: Icon, checks }]) => (
                <div key={category} className="bg-white rounded-lg border p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Icon className="w-6 h-6 text-blue-500" />
                        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    </div>

                    <div className="space-y-4">
                        {checks.map(check => (
                            <div key={check.id} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={formData.sites[0].security[category].checks[check.id].implemented}
                                            onChange={(e) => handleCheckChange(category, check.id, 'implemented', e.target.checked)}
                                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <label className="text-sm font-medium text-gray-900">{check.label}</label>
                                                <PriorityBadge severity={check.severity} />
                                            </div>
                                            <div className="flex space-x-2">
                                                <input
                                                    type="text"
                                                    value={formData.sites[0].security[category].checks[check.id].product || ''}
                                                    onChange={(e) => handleCheckChange(category, check.id, 'product', e.target.value)}
                                                    placeholder={check.placeholder}
                                                    className="w-64 text-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-2 pl-10">
                                    <input
                                        type="text"
                                        value={formData.sites[0].security[category].checks[check.id].notes || ''}
                                        onChange={(e) => handleCheckChange(category, check.id, 'notes', e.target.value)}
                                        placeholder="Add notes..."
                                        className="w-full text-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        ))}

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Additional Notes for {title}
                            </label>
                            <textarea
                                value={formData.sites[0].security[category].notes || ''}
                                onChange={(e) => handleNotesChange(category, e.target.value)}
                                className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                rows="2"
                                placeholder="Add any additional notes or concerns..."
                            />
                        </div>
                    </div>
                </div>
            ))}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <Shield className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
                    <div>
                        <h3 className="text-sm font-medium text-blue-800">Security Assessment Summary</h3>
                        <p className="mt-1 text-sm text-blue-600">
                            This assessment covers key security areas. Prioritize items marked as high priority
                            and ensure implementation of fundamental security measures. Regular review and updates
                            are recommended.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityForm;